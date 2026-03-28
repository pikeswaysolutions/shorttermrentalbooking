import { createClient } from "npm:@supabase/supabase-js@2.97.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return jsonResponse({ error: "Missing or invalid authorization header" }, 401);
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !caller) {
      return jsonResponse({ error: "Unauthorized: " + (authError?.message || "invalid token") }, 401);
    }

    if (caller.app_metadata?.role !== "admin") {
      return jsonResponse({ error: "Forbidden: admin role required" }, 403);
    }

    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    const funcIndex = pathParts.indexOf("manage-users");
    const subPath = funcIndex >= 0 ? pathParts.slice(funcIndex + 1).join("/") : "";

    if (req.method === "GET" && !subPath) {
      const { data: { users }, error } = await supabase.auth.admin.listUsers();
      if (error) throw error;

      const adminUsers = (users || []).filter(
        (u: any) => u.app_metadata?.role === "admin"
      );
      const safeUsers = adminUsers.map((u: any) => ({
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        email_confirmed_at: u.email_confirmed_at,
      }));

      return jsonResponse({ users: safeUsers });
    }

    if (req.method === "POST" && !subPath) {
      const body = await req.json();
      const { email, password } = body;
      if (!email || !password) {
        return jsonResponse({ error: "Email and password are required" }, 400);
      }
      if (password.length < 8) {
        return jsonResponse({ error: "Password must be at least 8 characters" }, 400);
      }

      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        app_metadata: { role: "admin" },
        user_metadata: { role: "admin" },
        email_confirm: true,
      });
      if (error) throw error;

      return jsonResponse(
        {
          user: {
            id: data.user.id,
            email: data.user.email,
            created_at: data.user.created_at,
          },
        },
        201
      );
    }

    if (req.method === "DELETE" && subPath) {
      const userId = subPath;
      if (userId === caller.id) {
        return jsonResponse({ error: "You cannot delete your own account" }, 400);
      }

      const { error } = await supabase.auth.admin.deleteUser(userId);
      if (error) throw error;

      return jsonResponse({ success: true });
    }

    return jsonResponse({ error: "Not found" }, 404);
  } catch (err: any) {
    return jsonResponse({ error: err.message || "Internal server error" }, 500);
  }
});
