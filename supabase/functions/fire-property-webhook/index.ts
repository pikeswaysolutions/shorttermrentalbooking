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
    const body = await req.json();
    const { bookingId } = body;
    console.log("fire-property-webhook: received bookingId =", bookingId);

    if (!bookingId) {
      console.error("fire-property-webhook: missing bookingId in request body");
      return new Response(
        JSON.stringify({ error: "bookingId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    console.log("fire-property-webhook: fetching booking record...");
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("id, check_in_date, check_out_date, guest_count, contact_name, contact_email, contact_phone, total_price, updated_at, property_id, description_of_use, notes")
      .eq("id", bookingId)
      .maybeSingle();

    if (bookingError) {
      console.error("fire-property-webhook: booking fetch error:", bookingError.message);
      return new Response(
        JSON.stringify({ error: bookingError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!booking) {
      console.error("fire-property-webhook: no booking found for id:", bookingId);
      return new Response(
        JSON.stringify({ error: "Booking not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("fire-property-webhook: booking found, property_id =", booking.property_id);
    console.log("fire-property-webhook: fetching property record...");

    const { data: property, error: propertyError } = await supabase
      .from("properties")
      .select("name, webhook_url")
      .eq("id", booking.property_id)
      .maybeSingle();

    if (propertyError) {
      console.error("fire-property-webhook: property fetch error:", propertyError.message);
      return new Response(
        JSON.stringify({ error: propertyError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!property) {
      console.error("fire-property-webhook: no property found for id:", booking.property_id);
      return new Response(
        JSON.stringify({ error: "Property not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("fire-property-webhook: property name =", property.name, "| webhook_url =", property.webhook_url ?? "(none)");

    if (!property.webhook_url) {
      console.log("fire-property-webhook: no webhook URL configured, exiting gracefully.");
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
      property_name: property.name,
      check_in_date: booking.check_in_date,
      check_out_date: booking.check_out_date,
      nights,
      guest_count: booking.guest_count,
      contact_name: booking.contact_name,
      contact_email: booking.contact_email,
      contact_phone: booking.contact_phone,
      total_price: Number(booking.total_price),
      confirmed_at: booking.updated_at,
      intended_use: booking.description_of_use ?? null,
      additional_comments: booking.notes ?? null,
    };

    console.log("fire-property-webhook: sending POST to:", property.webhook_url);

    const webhookResponse = await fetch(property.webhook_url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    console.log("fire-property-webhook: destination responded with status:", webhookResponse.status);

    return new Response(
      JSON.stringify({ success: true, webhook_status: webhookResponse.status }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("fire-property-webhook: unhandled exception:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
