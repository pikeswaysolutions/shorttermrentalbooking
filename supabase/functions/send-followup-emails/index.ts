import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

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
      .select("api_keys_encrypted")
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

    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const threeDaysAgoStr = threeDaysAgo.toISOString().split("T")[0];

    const { data: bookings, error: fetchError } = await supabase
      .from("bookings")
      .select("*, event_types(*)")
      .eq("status", "confirmed")
      .eq("followup_email_sent", false)
      .lte("date", threeDaysAgoStr);

    if (fetchError) {
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!bookings || bookings.length === 0) {
      return new Response(
        JSON.stringify({ message: "No follow-up emails to send", count: 0 }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let sentCount = 0;
    let failedCount = 0;

    for (const booking of bookings) {
      const templateId =
        booking.event_types?.email_templates?.followupTemplateId;

      if (!templateId) {
        await supabase.from("email_logs").insert({
          booking_id: booking.id,
          type: "followup",
          status: "failed",
          error_message:
            "No follow-up email template ID configured for this event type",
        });
        failedCount++;
        continue;
      }

      const startTime = booking.start_time?.slice(0, 5);

      let formattedDate = booking.date || "";
      if (formattedDate && formattedDate.includes("-")) {
        const [y, m, d] = formattedDate.split("-");
        if (y && m && d) formattedDate = `${m}-${d}-${y}`;
      }

      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Rivers End Events <riversendevents@pikeswaysolutions.com>",
          to: [booking.contact_email],
          reply_to: "bookings@riversendevents.com",
          subject: `How was your event? - ${booking.event_types?.name || "Event"}`,
          template: {
            id: templateId,
            variables: {
              EventType: booking.event_types?.name || "Event",
              EventDate: formattedDate,
              EventStart: startTime || "",
            },
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
          type: "followup",
          status: "sent",
        });
        sentCount++;
      } else {
        const errBody = await response.text();
        await supabase.from("email_logs").insert({
          booking_id: booking.id,
          type: "followup",
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
      new_value: { sent: sentCount, failed: failedCount, total: bookings.length },
    });

    return new Response(
      JSON.stringify({
        message: "Follow-up emails processed",
        sent: sentCount,
        failed: failedCount,
        total: bookings.length,
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
