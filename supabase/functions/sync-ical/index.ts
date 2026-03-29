import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ICalEvent {
  uid: string;
  dtstart: string;
  dtend: string;
  summary?: string;
}

function parseICalDate(dateStr: string): string | null {
  if (!dateStr) return null;

  const cleanDate = dateStr.replace(/^(DTSTART|DTEND)[^:]*:/i, "").trim();

  if (/^\d{8}$/.test(cleanDate)) {
    return `${cleanDate.slice(0, 4)}-${cleanDate.slice(4, 6)}-${cleanDate.slice(6, 8)}`;
  }

  if (/^\d{8}T\d{6}Z?$/.test(cleanDate)) {
    return `${cleanDate.slice(0, 4)}-${cleanDate.slice(4, 6)}-${cleanDate.slice(6, 8)}`;
  }

  return null;
}

function parseICalFeed(icalText: string): ICalEvent[] {
  const events: ICalEvent[] = [];
  const lines = icalText.replace(/\r\n /g, "").split(/\r?\n/);

  let currentEvent: Partial<ICalEvent> | null = null;

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (trimmedLine === "BEGIN:VEVENT") {
      currentEvent = {};
    } else if (trimmedLine === "END:VEVENT" && currentEvent) {
      if (currentEvent.uid && currentEvent.dtstart && currentEvent.dtend) {
        events.push(currentEvent as ICalEvent);
      }
      currentEvent = null;
    } else if (currentEvent) {
      if (trimmedLine.startsWith("UID:")) {
        currentEvent.uid = trimmedLine.slice(4).trim();
      } else if (trimmedLine.toUpperCase().startsWith("DTSTART")) {
        currentEvent.dtstart = parseICalDate(trimmedLine) || "";
      } else if (trimmedLine.toUpperCase().startsWith("DTEND")) {
        currentEvent.dtend = parseICalDate(trimmedLine) || "";
      } else if (trimmedLine.startsWith("SUMMARY:")) {
        currentEvent.summary = trimmedLine.slice(8).trim();
      }
    }
  }

  return events;
}

function getDatesInRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const start = new Date(startDate + "T00:00:00Z");
  const end = new Date(endDate + "T00:00:00Z");

  const current = new Date(start);
  while (current < end) {
    dates.push(current.toISOString().split("T")[0]);
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return dates;
}

function detectSource(url: string): string {
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes("airbnb")) return "airbnb";
  if (lowerUrl.includes("vrbo") || lowerUrl.includes("homeaway")) return "vrbo";
  return "ical";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: properties, error: propertiesError } = await supabase
      .from("properties")
      .select("id, name, ical_import_urls")
      .not("ical_import_urls", "eq", "{}");

    if (propertiesError) {
      throw new Error(`Failed to fetch properties: ${propertiesError.message}`);
    }

    const results: Array<{
      propertyId: string;
      propertyName: string;
      url: string;
      status: string;
      eventsProcessed?: number;
      datesBlocked?: number;
      datesRemoved?: number;
      error?: string;
    }> = [];

    const today = new Date().toISOString().split("T")[0];

    for (const property of properties || []) {
      const importUrls = property.ical_import_urls || [];

      for (const url of importUrls) {
        if (!url || !url.startsWith("http")) {
          results.push({
            propertyId: property.id,
            propertyName: property.name,
            url,
            status: "skipped",
            error: "Invalid URL",
          });
          continue;
        }

        try {
          const response = await fetch(url, {
            headers: {
              "User-Agent": "Luxe-Rentals-iCal-Sync/1.0",
            },
          });

          if (!response.ok) {
            results.push({
              propertyId: property.id,
              propertyName: property.name,
              url,
              status: "error",
              error: `HTTP ${response.status}: ${response.statusText}`,
            });
            continue;
          }

          const icalText = await response.text();
          const events = parseICalFeed(icalText);
          const source = detectSource(url);

          const futureEvents = events.filter(e => e.dtend >= today);

          const currentExternalUids = new Set<string>();
          let datesBlocked = 0;

          for (const event of futureEvents) {
            const prefixedUid = `${source}:${event.uid}`;
            currentExternalUids.add(prefixedUid);

            const datesToBlock = getDatesInRange(event.dtstart, event.dtend);

            for (const date of datesToBlock) {
              if (date < today) continue;

              const { data: existing } = await supabase
                .from("blocked_dates")
                .select("id")
                .eq("property_id", property.id)
                .eq("date", date)
                .eq("external_uid", prefixedUid)
                .maybeSingle();

              if (!existing) {
                const reason = event.summary
                  ? `${source.charAt(0).toUpperCase() + source.slice(1)}: ${event.summary}`
                  : `${source.charAt(0).toUpperCase() + source.slice(1)}: Reserved`;

                await supabase.from("blocked_dates").insert({
                  property_id: property.id,
                  date,
                  reason,
                  external_uid: prefixedUid,
                  source,
                });
                datesBlocked++;
              }
            }
          }

          const { data: existingBlocks } = await supabase
            .from("blocked_dates")
            .select("id, external_uid, date")
            .eq("property_id", property.id)
            .eq("source", source)
            .gte("date", today);

          let datesRemoved = 0;
          for (const block of existingBlocks || []) {
            if (block.external_uid && !currentExternalUids.has(block.external_uid)) {
              await supabase
                .from("blocked_dates")
                .delete()
                .eq("id", block.id);
              datesRemoved++;
            }
          }

          results.push({
            propertyId: property.id,
            propertyName: property.name,
            url,
            status: "success",
            eventsProcessed: futureEvents.length,
            datesBlocked,
            datesRemoved,
          });

        } catch (fetchError) {
          results.push({
            propertyId: property.id,
            propertyName: property.name,
            url,
            status: "error",
            error: fetchError instanceof Error ? fetchError.message : "Unknown error",
          });
        }
      }

      await supabase
        .from("properties")
        .update({ ical_last_synced_at: new Date().toISOString() })
        .eq("id", property.id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        syncedAt: new Date().toISOString(),
        results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("Sync iCal error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
