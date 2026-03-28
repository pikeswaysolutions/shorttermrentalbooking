import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { format, parseISO, differenceInDays, addDays } from "npm:date-fns@3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

function formatTime(time24: string): string {
  const [hours, minutes] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: settings } = await supabase
      .from("settings")
      .select("api_keys_encrypted, company_name, standard_check_in_time, standard_check_out_time")
      .eq("id", 1)
      .maybeSingle();

    const resendApiKey = settings?.api_keys_encrypted;
    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ error: "No Resend API key configured" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const companyName = settings?.company_name || "Luxe Rentals";
    const checkInTime = settings?.standard_check_in_time || "15:00";
    const checkOutTime = settings?.standard_check_out_time || "11:00";

    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');
    const tomorrowStr = format(addDays(today, 1), 'yyyy-MM-dd');
    const yesterdayStr = format(addDays(today, -1), 'yyyy-MM-dd');

    // Find bookings that need pre-arrival check-in instructions (check-in tomorrow)
    const { data: preArrivalBookings, error: preArrivalError } = await supabase
      .from("bookings")
      .select("*, properties(*)")
      .eq("status", "confirmed")
      .eq("followup_email_sent", false)
      .eq("check_in_date", tomorrowStr);

    // Find bookings that need post-checkout review requests (checked out yesterday)
    const { data: postCheckoutBookings, error: postCheckoutError } = await supabase
      .from("bookings")
      .select("*, properties(*)")
      .eq("status", "confirmed")
      .eq("followup_email_sent", false)
      .eq("check_out_date", yesterdayStr);

    if (preArrivalError || postCheckoutError) {
      return new Response(
        JSON.stringify({
          error: preArrivalError?.message || postCheckoutError?.message
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const allBookings = [
      ...(preArrivalBookings || []).map(b => ({ ...b, emailType: 'pre_arrival' })),
      ...(postCheckoutBookings || []).map(b => ({ ...b, emailType: 'post_checkout' }))
    ];

    if (allBookings.length === 0) {
      return new Response(
        JSON.stringify({
          message: "No follow-up emails to send",
          count: 0
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let sentCount = 0;
    let failedCount = 0;

    for (const booking of allBookings) {
      const isPreArrival = booking.emailType === 'pre_arrival';

      // Determine which template to use
      const templateId = isPreArrival
        ? booking.properties?.email_templates?.preArrivalTemplateId
        : booking.properties?.email_templates?.followupTemplateId;

      if (!templateId) {
        await supabase.from("email_logs").insert({
          booking_id: booking.id,
          type: isPreArrival ? "pre_arrival" : "followup",
          status: "failed",
          error_message: `No ${isPreArrival ? 'pre-arrival' : 'follow-up'} email template ID configured for this property`,
        });
        failedCount++;
        continue;
      }

      const propertyName = booking.properties?.name || "Property";
      const checkInDateFormatted = format(parseISO(booking.check_in_date), 'EEEE, MMMM d');
      const checkOutDateFormatted = format(parseISO(booking.check_out_date), 'EEEE, MMMM d');
      const nights = differenceInDays(
        parseISO(booking.check_out_date),
        parseISO(booking.check_in_date)
      );

      let subject: string;
      let emailVariables: Record<string, string>;

      if (isPreArrival) {
        subject = `Check-In Instructions - ${propertyName}`;
        emailVariables = {
          PropertyName: propertyName,
          ContactName: booking.contact_name,
          CheckInDate: checkInDateFormatted,
          CheckInTime: formatTime(checkInTime),
          CheckOutDate: checkOutDateFormatted,
          CheckOutTime: formatTime(checkOutTime),
          Nights: nights.toString(),
          GuestCount: booking.guest_count.toString(),
        };
      } else {
        subject = `How was your stay at ${propertyName}?`;
        emailVariables = {
          PropertyName: propertyName,
          ContactName: booking.contact_name,
          CheckInDate: checkInDateFormatted,
          CheckOutDate: checkOutDateFormatted,
          Nights: nights.toString(),
        };
      }

      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: `${companyName} <bookings@luxerentals.com>`,
          to: [booking.contact_email],
          reply_to: "bookings@luxerentals.com",
          subject: subject,
          template: {
            id: templateId,
            variables: emailVariables,
          },
        }),
      });

      if (response.ok) {
        await supabase
          .from("bookings")
          .update({ followup_email_sent: true })
          .eq("id", booking.id);
        await supabase.from("email_logs").insert({
          booking_id: booking.id,
          type: isPreArrival ? "pre_arrival" : "followup",
          status: "sent",
        });
        sentCount++;
      } else {
        const errBody = await response.text();
        await supabase.from("email_logs").insert({
          booking_id: booking.id,
          type: isPreArrival ? "pre_arrival" : "followup",
          status: "failed",
          error_message: errBody,
        });
        failedCount++;
      }
    }

    await supabase.from("audit_logs").insert({
      entity_type: "email",
      entity_id: "followup-batch",
      action: "followup_batch_sent",
      new_value: {
        sent: sentCount,
        failed: failedCount,
        total: allBookings.length,
        pre_arrival_count: allBookings.filter(b => b.emailType === 'pre_arrival').length,
        post_checkout_count: allBookings.filter(b => b.emailType === 'post_checkout').length,
      },
    });

    return new Response(
      JSON.stringify({
        message: "Follow-up emails processed",
        sent: sentCount,
        failed: failedCount,
        total: allBookings.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message || "Internal error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
