import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { replyToComment } from "@/lib/meta/api";

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

  const { comment_id, reply_text } = await request.json();

  if (!comment_id || !reply_text) {
    return NextResponse.json(
      { error: "comment_id et reply_text requis" },
      { status: 400 }
    );
  }

  // Get the comment
  const { data: comment } = await supabase
    .from("comments")
    .select("*")
    .eq("id", comment_id)
    .eq("org_id", membership.org_id)
    .single();

  if (!comment) {
    return NextResponse.json(
      { error: "Commentaire non trouvé" },
      { status: 404 }
    );
  }

  // Get the page access token
  const { data: account } = await supabase
    .from("connected_accounts")
    .select("access_token")
    .eq("org_id", membership.org_id)
    .eq("platform", "facebook")
    .eq("page_id", comment.page_id!)
    .limit(1)
    .single();

  if (!account?.access_token) {
    return NextResponse.json(
      { error: "Compte Facebook non trouvé pour cette page" },
      { status: 400 }
    );
  }

  try {
    const result = await replyToComment(
      comment.meta_comment_id,
      reply_text,
      account.access_token
    );

    // Update comment status
    await supabase
      .from("comments")
      .update({
        reply_status: "published",
        ai_reply: reply_text,
        meta_reply_id: result.id,
        replied_at: new Date().toISOString(),
      })
      .eq("id", comment_id);

    return NextResponse.json({ success: true, reply_id: result.id });
  } catch (err) {
    console.error("Reply error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Échec de la réponse : ${message}` },
      { status: 500 }
    );
  }
}
