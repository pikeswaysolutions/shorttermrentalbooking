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

    const { bookingId } = await req.json();

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
      .select("*, event_types(*)")
      .eq("id", bookingId)
      .maybeSingle();

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
      .select("api_keys_encrypted")
      .eq("id", 1)
      .maybeSingle();

    const apiKey = settings?.api_keys_encrypted;
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
      booking.event_types?.email_templates?.confirmationTemplateId;
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
          "No confirmation email template configured for this event type",
      });
      return new Response(
        JSON.stringify({
          error:
            "No confirmation email template configured for this event type",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
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
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Rivers End Events <riversendevents@pikeswaysolutions.com>",
        to: [booking.contact_email],
        reply_to: "bookings@riversendevents.com",
        subject: `Booking Confirmed - ${booking.event_types?.name || "Event"}`,
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
