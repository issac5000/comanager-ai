import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import {
  exchangeCodeForToken,
  getLongLivedUserToken,
  getUserPages,
  getInstagramAccount,
} from "@/lib/meta/api";
import { calculateExpiryDate } from "@/lib/meta/tokens";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  // User denied permissions
  if (error) {
    return NextResponse.redirect(
      `${origin}/accounts?error=meta_auth_denied`
    );
  }

  // Verify CSRF state
  const cookieStore = await cookies();
  const savedState = cookieStore.get("meta_oauth_state")?.value;
  cookieStore.delete("meta_oauth_state");

  if (!state || !savedState || state !== savedState) {
    return NextResponse.redirect(
      `${origin}/accounts?error=invalid_state`
    );
  }

  if (!code) {
    return NextResponse.redirect(
      `${origin}/accounts?error=no_code`
    );
  }

  // Verify user is authenticated
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${origin}/login`);
  }

  // Get org_id
  const { data: membership } = await supabase
    .from("organization_members")
    .select("org_id")
    .eq("user_id", user.id)
    .limit(1)
    .single();

  if (!membership?.org_id) {
    return NextResponse.redirect(
      `${origin}/accounts?error=no_organization`
    );
  }

  try {
    const redirectUri = `${origin}/api/meta/callback`;

    // 1. Exchange code for short-lived token
    let shortToken: string;
    try {
      const result = await exchangeCodeForToken(code, redirectUri);
      shortToken = result.access_token;
    } catch (err) {
      console.error("Meta token exchange failed:", err);
      return NextResponse.redirect(
        `${origin}/accounts?error=token_exchange_failed`
      );
    }

    // 2. Exchange for long-lived user token (~60 days)
    let longUserToken: string;
    let expires_in: number | undefined;
    try {
      const result = await getLongLivedUserToken(shortToken);
      longUserToken = result.access_token;
      expires_in = result.expires_in;
    } catch (err) {
      console.error("Meta long-lived token failed:", err);
      return NextResponse.redirect(
        `${origin}/accounts?error=long_token_failed`
      );
    }

    const tokenExpiresAt = calculateExpiryDate(expires_in);

    // 3. Get user's Facebook Pages (page tokens are long-lived/permanent)
    let pages;
    let pagesRaw: string;
    try {
      const result = await getUserPages(longUserToken);
      pages = result.pages;
      pagesRaw = result.raw;
    } catch (err) {
      console.error("Meta get pages failed:", err);
      return NextResponse.redirect(
        `${origin}/accounts?error=get_pages_failed`
      );
    }

    if (pages.length === 0) {
      // Try older API versions as fallback
      const versions = ["v19.0", "v20.0", "v21.0"];
      let debugInfo = `v22=${pagesRaw}`;
      for (const ver of versions) {
        try {
          const res = await fetch(
            `https://graph.facebook.com/${ver}/me/accounts?access_token=${longUserToken}&fields=id,name,access_token`
          );
          const data = await res.text();
          debugInfo += ` | ${ver}=${data}`;
          const parsed = JSON.parse(data);
          if (parsed.data && parsed.data.length > 0) {
            // Found pages with older version! Use them.
            pages = parsed.data;
            pagesRaw = data;
            break;
          }
        } catch { /* ignore */ }
      }

      // If still no pages, try with app token to get user's pages
      if (pages.length === 0) {
        try {
          const appToken = `${process.env.META_APP_ID}|${process.env.META_APP_SECRET}`;
          const res = await fetch(
            `https://graph.facebook.com/v22.0/122117846559217925/accounts?access_token=${longUserToken}`
          );
          const data = await res.text();
          debugInfo += ` | user_id_accounts=${data}`;
        } catch { /* ignore */ }
      }

      if (pages.length === 0) {
        return NextResponse.redirect(
          `${origin}/accounts?error=no_pages&detail=${encodeURIComponent(debugInfo.slice(0, 800))}`
        );
      }
    }

    // 4. For each page, save Facebook + detect and save Instagram
    for (const page of pages) {
      // Upsert Facebook account
      const { data: existingFb } = await supabase
        .from("connected_accounts")
        .select("id")
        .eq("org_id", membership.org_id)
        .eq("platform", "facebook")
        .eq("page_id", page.id)
        .limit(1)
        .single();

      // Check for linked Instagram Business account
      const igAccount = await getInstagramAccount(page.id, page.access_token);

      if (existingFb) {
        await supabase
          .from("connected_accounts")
          .update({
            access_token: page.access_token,
            platform_username: page.name,
            page_name: page.name,
            token_expires_at: tokenExpiresAt,
            ig_user_id: igAccount?.id || null,
            ig_username: igAccount?.username || null,
          })
          .eq("id", existingFb.id);
      } else {
        await supabase.from("connected_accounts").insert({
          org_id: membership.org_id,
          platform: "facebook",
          platform_user_id: page.id,
          platform_username: page.name,
          access_token: page.access_token,
          page_id: page.id,
          page_name: page.name,
          token_expires_at: tokenExpiresAt,
          ig_user_id: igAccount?.id || null,
          ig_username: igAccount?.username || null,
        });
      }

      // Upsert Instagram account if linked
      if (igAccount) {
        const { data: existingIg } = await supabase
          .from("connected_accounts")
          .select("id")
          .eq("org_id", membership.org_id)
          .eq("platform", "instagram")
          .eq("ig_user_id", igAccount.id)
          .limit(1)
          .single();

        if (existingIg) {
          await supabase
            .from("connected_accounts")
            .update({
              access_token: page.access_token,
              platform_username: igAccount.username,
              ig_username: igAccount.username,
              page_id: page.id,
              page_name: page.name,
              token_expires_at: tokenExpiresAt,
            })
            .eq("id", existingIg.id);
        } else {
          await supabase.from("connected_accounts").insert({
            org_id: membership.org_id,
            platform: "instagram",
            platform_user_id: igAccount.id,
            platform_username: igAccount.username,
            access_token: page.access_token,
            page_id: page.id,
            page_name: page.name,
            ig_user_id: igAccount.id,
            ig_username: igAccount.username,
            token_expires_at: tokenExpiresAt,
          });
        }
      }
    }

    return NextResponse.redirect(`${origin}/accounts?success=meta_connected`);
  } catch (err) {
    console.error("Meta OAuth callback error:", err);
    const errMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.redirect(
      `${origin}/accounts?error=meta_callback_failed&detail=${encodeURIComponent(errMsg.slice(0, 200))}`
    );
  }
}
