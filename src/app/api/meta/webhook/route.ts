import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { generateCommentReply } from "@/lib/ai/deepseek";

/**
 * GET - Webhook verification (Meta sends a challenge).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (
    mode === "subscribe" &&
    token === process.env.META_WEBHOOK_VERIFY_TOKEN
  ) {
    return new Response(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

/**
 * POST - Receive webhook events from Meta (comments on page posts).
 */
export async function POST(request: Request) {
  const body = await request.json();

  // Always respond 200 quickly to Meta
  // Process asynchronously
  processWebhookEntries(body.entry || []).catch((err) =>
    console.error("Webhook processing error:", err)
  );

  return NextResponse.json({ received: true });
}

async function processWebhookEntries(
  entries: Array<{
    id: string;
    time: number;
    changes?: Array<{
      field: string;
      value: Record<string, unknown>;
    }>;
  }>
) {
  const supabase = createServiceClient();

  for (const entry of entries) {
    const pageId = entry.id;

    for (const change of entry.changes || []) {
      if (change.field !== "feed") continue;

      const value = change.value as {
        item?: string;
        verb?: string;
        comment_id?: string;
        parent_id?: string;
        sender_name?: string;
        sender_id?: string;
        message?: string;
        post_id?: string;
      };

      // Only process new comments (not edits, deletes, etc.)
      if (value.item !== "comment" || value.verb !== "add") continue;
      if (!value.comment_id || !value.message) continue;

      // Find the connected account by page_id to get org context
      const { data: account } = await supabase
        .from("connected_accounts")
        .select("org_id, access_token, page_id")
        .eq("platform", "facebook")
        .eq("page_id", pageId)
        .limit(1)
        .single();

      if (!account?.org_id) continue;

      // Skip if we already processed this comment
      const { data: existing } = await supabase
        .from("comments")
        .select("id")
        .eq("meta_comment_id", value.comment_id)
        .limit(1)
        .single();

      if (existing) continue;

      // Try to match the comment to one of our posts
      let postId: string | null = null;
      let postCaption: string | null = null;
      const metaPostId = value.post_id || value.parent_id || null;

      if (metaPostId) {
        const { data: post } = await supabase
          .from("posts")
          .select("id, caption")
          .eq("org_id", account.org_id)
          .eq("meta_post_id", metaPostId)
          .limit(1)
          .single();

        if (post) {
          postId = post.id;
          postCaption = post.caption;
        }
      }

      // Get org context for AI
      const { data: org } = await supabase
        .from("organizations")
        .select("name, description, brand_voice, custom_industry, industry_id")
        .eq("id", account.org_id)
        .single();

      // Get industry name if needed
      let industryName: string | null = org?.custom_industry || null;
      if (!industryName && org?.industry_id) {
        const { data: industry } = await supabase
          .from("industries")
          .select("name")
          .eq("id", org.industry_id)
          .single();
        industryName = industry?.name || null;
      }

      // Generate AI reply
      let aiReply: string | null = null;
      let replyStatus = "pending_review";
      try {
        aiReply = await generateCommentReply({
          commentText: value.message,
          postCaption,
          orgName: org?.name || "Mon entreprise",
          orgDescription: org?.description || null,
          brandVoice: org?.brand_voice || null,
          industryName,
          commenterName: value.sender_name || null,
        });

        // If AI says IGNORE, mark as ignored
        if (aiReply.trim().toUpperCase() === "IGNORE") {
          replyStatus = "ignored";
          aiReply = null;
        }
      } catch (err) {
        console.error("AI reply generation failed:", err);
        replyStatus = "pending_review";
      }

      // Store the comment
      await supabase.from("comments").insert({
        org_id: account.org_id,
        post_id: postId,
        meta_comment_id: value.comment_id,
        meta_post_id: metaPostId,
        platform: "facebook",
        commenter_name: value.sender_name || null,
        commenter_id: value.sender_id || null,
        comment_text: value.message,
        ai_reply: aiReply,
        reply_status: replyStatus,
        page_id: pageId,
      });
    }
  }
}
