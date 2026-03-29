import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function formatDateToIcal(dateStr: string): string {
  return dateStr.replace(/-/g, "");
}

function escapeIcalText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function generateUid(bookingId: string, domain: string): string {
  return `${bookingId}@${domain}`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return new Response(
        JSON.stringify({ error: "Missing token parameter" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: property, error: propertyError } = await supabase
      .from("properties")
      .select("id, name, ical_export_token")
      .eq("ical_export_token", token)
      .maybeSingle();

    if (propertyError || !property) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const today = new Date().toISOString().split("T")[0];

    const { data: bookings, error: bookingsError } = await supabase
      .from("bookings")
      .select("id, check_in_date, check_out_date, status, created_at")
      .eq("property_id", property.id)
      .in("status", ["confirmed", "pending"])
      .gte("check_out_date", today)
      .order("check_in_date", { ascending: true });

    if (bookingsError) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch bookings" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const domain = new URL(supabaseUrl).hostname.replace(".supabase.co", "");
    const calendarName = escapeIcalText(property.name);
    const now = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

    let icalContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      `PRODID:-//Luxe Rentals//STR Platform//EN`,
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      `X-WR-CALNAME:${calendarName}`,
    ];

    for (const booking of bookings || []) {
      const uid = generateUid(booking.id, domain);
      const dtstart = formatDateToIcal(booking.check_in_date);
      const dtend = formatDateToIcal(booking.check_out_date);
      const status = booking.status === "confirmed" ? "CONFIRMED" : "TENTATIVE";
      const summary = escapeIcalText(`Booked - ${property.name}`);
      const description = escapeIcalText("Reserved via Direct Booking");
      const dtstamp = booking.created_at
        ? booking.created_at.replace(/[-:]/g, "").split(".")[0] + "Z"
        : now;

      icalContent.push(
        "BEGIN:VEVENT",
        `UID:${uid}`,
        `DTSTAMP:${dtstamp}`,
        `DTSTART;VALUE=DATE:${dtstart}`,
        `DTEND;VALUE=DATE:${dtend}`,
        `SUMMARY:${summary}`,
        `DESCRIPTION:${description}`,
        `STATUS:${status}`,
        "END:VEVENT"
      );
    }

    icalContent.push("END:VCALENDAR");

    const icsString = icalContent.join("\r\n");

    return new Response(icsString, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="${property.name.replace(/[^a-zA-Z0-9]/g, "_")}_calendar.ics"`,
      },
    });
  } catch (error) {
    console.error("Export iCal error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
