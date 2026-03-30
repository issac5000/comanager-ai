import { type NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Get org and revoke any existing Meta permissions before reconnecting
  const { data: membership } = await supabase
    .from("organization_members")
    .select("org_id")
    .eq("user_id", user.id)
    .limit(1)
    .single();

  if (membership?.org_id) {
    const { data: existingAccounts } = await supabase
      .from("connected_accounts")
      .select("access_token")
      .eq("org_id", membership.org_id);

    // Revoke all existing Meta tokens to force fresh page selection
    if (existingAccounts) {
      for (const acc of existingAccounts) {
        if (acc.access_token) {
          try {
            await fetch(
              `https://graph.facebook.com/v22.0/me/permissions?access_token=${acc.access_token}`,
              { method: "DELETE" }
            );
          } catch {
            // Non-blocking
          }
        }
      }
      // Clean up old accounts
      await supabase
        .from("connected_accounts")
        .delete()
        .eq("org_id", membership.org_id);
    }
  }

  // Generate CSRF state token
  const state = crypto.randomUUID();
  const cookieStore = await cookies();
  cookieStore.set("meta_oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600, // 10 minutes
    path: "/",
  });

  const { origin } = new URL(request.url);
  const redirectUri = `${origin}/api/meta/callback`;

  const scopes = [
    "pages_show_list",
    "pages_manage_posts",
    "pages_read_engagement",
  ].join(",");

  const authUrl = new URL("https://www.facebook.com/v22.0/dialog/oauth");
  authUrl.searchParams.set("client_id", process.env.META_APP_ID!);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", scopes);
  authUrl.searchParams.set("state", state);
  // Force Facebook to re-show the permission/page selection dialog on reconnection
  authUrl.searchParams.set("auth_type", "rerequest");

  return NextResponse.redirect(authUrl.toString());
}
