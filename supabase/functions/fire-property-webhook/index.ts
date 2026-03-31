import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { bookingId } = await req.json();

    if (!bookingId) {
      return new Response(
        JSON.stringify({ error: "bookingId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select(`
        id,
        check_in_date,
        check_out_date,
        guest_count,
        contact_name,
        contact_email,
        contact_phone,
        total_price,
        updated_at,
        property_id,
        properties (
          name,
          webhook_url
        )
      `)
      .eq("id", bookingId)
      .maybeSingle();

    if (bookingError || !booking) {
      return new Response(
        JSON.stringify({ error: "Booking not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const webhookUrl = booking.properties?.webhook_url;

    if (!webhookUrl) {
      return new Response(
        JSON.stringify({ message: "No webhook URL configured for this property. No action taken." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const checkIn = new Date(booking.check_in_date + "T00:00:00");
    const checkOut = new Date(booking.check_out_date + "T00:00:00");
    const nights = Math.round((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));

    const payload = {
      event: "booking.confirmed",
      booking_id: booking.id,
      property_name: booking.properties?.name ?? "",
      check_in_date: booking.check_in_date,
      check_out_date: booking.check_out_date,
      nights,
      guest_count: booking.guest_count,
      contact_name: booking.contact_name,
      contact_email: booking.contact_email,
      contact_phone: booking.contact_phone,
      total_price: Number(booking.total_price),
      confirmed_at: booking.updated_at,
    };

    const webhookResponse = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    return new Response(
      JSON.stringify({
        success: true,
        webhook_status: webhookResponse.status,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
