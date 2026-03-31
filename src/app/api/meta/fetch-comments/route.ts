import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateCommentReply } from "@/lib/ai/deepseek";

const META_BASE_URL = "https://graph.facebook.com/v22.0";

type MetaComment = {
  id: string;
  message: string;
  from?: { id: string; name: string };
  created_time?: string;
};

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

  // Get published posts that have a meta_post_id
  const { data: posts } = await supabase
    .from("posts")
    .select("id, caption, meta_post_id")
    .eq("org_id", membership.org_id)
    .eq("status", "published")
    .not("meta_post_id", "is", null);

  if (!posts || posts.length === 0) {
    return NextResponse.json({ new_comments: 0, message: "Aucun post publié avec ID Meta" });
  }

  // Get page access token
  const { data: account } = await supabase
    .from("connected_accounts")
    .select("access_token, page_id")
    .eq("org_id", membership.org_id)
    .eq("platform", "facebook")
    .limit(1)
    .single();

  if (!account?.access_token) {
    return NextResponse.json({ error: "Aucun compte Facebook connecté" }, { status: 400 });
  }

  // Get org context for AI replies
  const { data: org } = await supabase
    .from("organizations")
    .select("name, description, brand_voice, custom_industry, industry_id")
    .eq("id", membership.org_id)
    .single();

  let industryName: string | null = org?.custom_industry || null;
  if (!industryName && org?.industry_id) {
    const { data: industry } = await supabase
      .from("industries")
      .select("name")
      .eq("id", org.industry_id)
      .single();
    industryName = industry?.name || null;
  }

  let totalNew = 0;

  for (const post of posts) {
    if (!post.meta_post_id) continue;

    // Fetch comments from Meta
    const url = new URL(`${META_BASE_URL}/${post.meta_post_id}/comments`);
    url.searchParams.set("fields", "id,message,from,created_time");
    url.searchParams.set("access_token", account.access_token);
    url.searchParams.set("limit", "50");

    const res = await fetch(url.toString());
    if (!res.ok) continue;

    const data = await res.json();
    const comments = (data.data || []) as MetaComment[];

    for (const comment of comments) {
      if (!comment.id || !comment.message) continue;

      // Skip if already processed
      const { data: existing } = await supabase
        .from("comments")
        .select("id")
        .eq("meta_comment_id", comment.id)
        .limit(1)
        .single();

      if (existing) continue;

      // Skip comments from our own page
      if (comment.from?.id === account.page_id) continue;

      // Generate AI reply
      let aiReply: string | null = null;
      let replyStatus = "pending_review";
      try {
        aiReply = await generateCommentReply({
          commentText: comment.message,
          postCaption: post.caption,
          orgName: org?.name || "Mon entreprise",
          orgDescription: org?.description || null,
          brandVoice: org?.brand_voice || null,
          industryName,
          commenterName: comment.from?.name || null,
        });

        if (aiReply.trim().toUpperCase() === "IGNORE") {
          replyStatus = "ignored";
          aiReply = null;
        }
      } catch (err) {
        console.error("AI reply generation failed:", err);
      }

      // Store
      await supabase.from("comments").insert({
        org_id: membership.org_id,
        post_id: post.id,
        meta_comment_id: comment.id,
        meta_post_id: post.meta_post_id,
        platform: "facebook",
        commenter_name: comment.from?.name || null,
        commenter_id: comment.from?.id || null,
        comment_text: comment.message,
        ai_reply: aiReply,
        reply_status: replyStatus,
        page_id: account.page_id,
      });

      totalNew++;
    }
  }

  return NextResponse.json({ new_comments: totalNew });
}
