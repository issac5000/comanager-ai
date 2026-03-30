import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
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

  const { account_id } = await request.json();
  if (!account_id) {
    return NextResponse.json({ error: "account_id requis" }, { status: 400 });
  }

  // Fetch the account to get its access token before deleting
  const { data: account } = await supabase
    .from("connected_accounts")
    .select("access_token")
    .eq("id", account_id)
    .eq("org_id", membership.org_id)
    .single();

  // Revoke Meta permissions so the next connect shows the full dialog
  if (account?.access_token) {
    try {
      await fetch(
        `https://graph.facebook.com/v22.0/me/permissions?access_token=${account.access_token}`,
        { method: "DELETE" }
      );
    } catch {
      // Non-blocking: continue even if revoke fails
    }
  }

  // Delete all connected accounts for this org (FB + IG are linked)
  const { error } = await supabase
    .from("connected_accounts")
    .delete()
    .eq("org_id", membership.org_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
