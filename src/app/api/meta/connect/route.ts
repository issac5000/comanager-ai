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

  const authUrl = new URL("https://www.facebook.com/v22.0/dialog/oauth");
  authUrl.searchParams.set("client_id", process.env.META_APP_ID!);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("config_id", "2025380078039694");
  authUrl.searchParams.set("state", state);

  return NextResponse.redirect(authUrl.toString());
}
