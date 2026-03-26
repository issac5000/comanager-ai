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

  // Delete the account (only if it belongs to this org)
  const { error } = await supabase
    .from("connected_accounts")
    .delete()
    .eq("id", account_id)
    .eq("org_id", membership.org_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
