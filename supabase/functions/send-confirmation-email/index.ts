import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { format, parseISO, differenceInDays } from "npm:date-fns@3";

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

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { bookingId } = await req.json();
    console.log("send-confirmation-email: received bookingId =", bookingId);

    if (!bookingId) {
      return new Response(
        JSON.stringify({ error: "bookingId is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("*, properties(*)")
      .eq("id", bookingId)
      .maybeSingle();

    if (bookingError) {
      console.error("send-confirmation-email: booking fetch error:", bookingError.message);
    }
    if (!booking) {
      console.error("send-confirmation-email: no booking found for id:", bookingId);
    }
    if (bookingError || !booking) {
      return new Response(
        JSON.stringify({ error: bookingError?.message || "Booking not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: settings } = await supabase
      .from("settings")
      .select("api_keys_encrypted, company_name, standard_check_in_time, standard_check_out_time")
      .eq("id", 1)
      .maybeSingle();

    console.log("send-confirmation-email: booking found, property =", booking.properties?.name ?? "(none)");
    console.log("send-confirmation-email: contact_email =", booking.contact_email);

    const apiKey = settings?.api_keys_encrypted;
    console.log("send-confirmation-email: Resend API key present =", !!apiKey);
    if (!apiKey) {
      await supabase
        .from("bookings")
        .update({ email_status: "failed" })
        .eq("id", bookingId);
      await supabase.from("email_logs").insert({
        booking_id: bookingId,
        type: "confirmation",
        status: "failed",
        error_message: "No Resend API key configured",
      });
      return new Response(
        JSON.stringify({ error: "No Resend API key configured" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const templateId =
      booking.properties?.email_templates?.confirmationTemplateId;
    console.log("send-confirmation-email: templateId =", templateId ?? "(none)");
    if (!templateId) {
      await supabase
        .from("bookings")
        .update({ email_status: "failed" })
        .eq("id", bookingId);
      await supabase.from("email_logs").insert({
        booking_id: bookingId,
        type: "confirmation",
        status: "failed",
        error_message:
          "No confirmation email template configured for this property",
      });
      return new Response(
        JSON.stringify({
          error:
            "No confirmation email template configured for this property",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const propertyName = booking.properties?.name || "Property";
    const companyName = settings?.company_name || "Luxe Rentals";
    const checkInTime = settings?.standard_check_in_time || "15:00";
    const checkOutTime = settings?.standard_check_out_time || "11:00";

    const checkInDateFormatted = format(parseISO(booking.check_in_date), 'EEEE, MMMM d, yyyy');
    const checkOutDateFormatted = format(parseISO(booking.check_out_date), 'EEEE, MMMM d, yyyy');
    const nights = differenceInDays(parseISO(booking.check_out_date), parseISO(booking.check_in_date));

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${companyName} <bookings@luxerentals.com>`,
        to: [booking.contact_email],
        reply_to: "bookings@luxerentals.com",
        subject: `Your Reservation is Confirmed - ${propertyName}`,
        template: {
          id: templateId,
          variables: {
            PropertyName: propertyName,
            CheckInDate: checkInDateFormatted,
            CheckOutDate: checkOutDateFormatted,
            CheckInTime: formatTime(checkInTime),
            CheckOutTime: formatTime(checkOutTime),
            GuestCount: booking.guest_count.toString(),
            Nights: nights.toString(),
            ContactName: booking.contact_name,
            TotalPrice: formatCurrency(booking.total_price),
          },
        },
      }),
    });

    if (response.ok) {
      await supabase
        .from("bookings")
        .update({ email_status: "sent" })
        .eq("id", bookingId);
      await supabase.from("email_logs").insert({
        booking_id: bookingId,
        type: "confirmation",
        status: "sent",
      });
      return new Response(
        JSON.stringify({ success: true, message: "Confirmation email sent" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    } else {
      const errBody = await response.text();
      await supabase
        .from("bookings")
        .update({ email_status: "failed" })
        .eq("id", bookingId);
      await supabase.from("email_logs").insert({
        booking_id: bookingId,
        type: "confirmation",
        status: "failed",
        error_message: errBody,
      });
      return new Response(
        JSON.stringify({ error: "Resend API error", details: errBody }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
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
