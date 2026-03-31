import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const META_BASE_URL = "https://graph.facebook.com/v22.0";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { data: membership } = await supabase
    .from("organization_members")
    .select("org_id")
    .eq("user_id", user.id)
    .limit(1)
    .single();

  if (!membership?.org_id) {
    return NextResponse.json({ error: "Aucune organisation" }, { status: 400 });
  }

  // Get all Facebook connected accounts
  const { data: accounts } = await supabase
    .from("connected_accounts")
    .select("page_id, access_token, page_name")
    .eq("org_id", membership.org_id)
    .eq("platform", "facebook");

  if (!accounts || accounts.length === 0) {
    return NextResponse.json({ error: "Aucun compte Facebook connecté" }, { status: 400 });
  }

  const results = [];

  for (const account of accounts) {
    if (!account.page_id || !account.access_token) continue;

    const url = `${META_BASE_URL}/${account.page_id}/subscribed_apps`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subscribed_fields: "feed",
        access_token: account.access_token,
      }),
    });

    const body = await res.json();
    results.push({
      page: account.page_name,
      page_id: account.page_id,
      success: res.ok,
      response: body,
    });
  }

  return NextResponse.json({ results });
}
