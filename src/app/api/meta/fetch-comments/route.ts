import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateCommentReply } from "@/lib/ai/deepseek";

const META_BASE_URL = "https://graph.facebook.com/v22.0";

type FBComment = {
  id: string;
  message: string;
  from?: { id: string; name: string };
  created_time?: string;
};

type FBPost = {
  id: string;
  message?: string;
  comments?: { data: FBComment[] };
};

type IGComment = {
  id: string;
  text: string;
  from?: { id: string; username: string };
  timestamp?: string;
};

type IGMedia = {
  id: string;
  caption?: string;
  comments?: { data: IGComment[] };
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

  // Get all connected accounts
  const { data: accounts } = await supabase
    .from("connected_accounts")
    .select("access_token, page_id, ig_user_id, platform")
    .eq("org_id", membership.org_id);

  if (!accounts || accounts.length === 0) {
    return NextResponse.json({ error: "Aucun compte connecté" }, { status: 400 });
  }

  // Get the Facebook account (has the page token)
  const fbAccount = accounts.find((a) => a.platform === "facebook");
  if (!fbAccount?.access_token) {
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

  // --- FACEBOOK: Fetch page feed with comments ---
  try {
    const fbUrl = new URL(`${META_BASE_URL}/${fbAccount.page_id}/feed`);
    fbUrl.searchParams.set(
      "fields",
      "id,message,comments.limit(50){id,message,from,created_time}"
    );
    fbUrl.searchParams.set("limit", "25");
    fbUrl.searchParams.set("access_token", fbAccount.access_token);

    const fbRes = await fetch(fbUrl.toString());
    if (fbRes.ok) {
      const fbData = await fbRes.json();
      const fbPosts = (fbData.data || []) as FBPost[];

      for (const post of fbPosts) {
        const comments = post.comments?.data || [];
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
          if (comment.from?.id === fbAccount.page_id) continue;

          // Generate AI reply
          let aiReply: string | null = null;
          let replyStatus = "pending_review";
          try {
            aiReply = await generateCommentReply({
              commentText: comment.message,
              postCaption: post.message || null,
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

          await supabase.from("comments").insert({
            org_id: membership.org_id,
            meta_comment_id: comment.id,
            meta_post_id: post.id,
            platform: "facebook",
            commenter_name: comment.from?.name || null,
            commenter_id: comment.from?.id || null,
            comment_text: comment.message,
            ai_reply: aiReply,
            reply_status: replyStatus,
            page_id: fbAccount.page_id,
          });

          totalNew++;
        }
      }
    } else {
      const errBody = await fbRes.json().catch(() => ({}));
      console.error("Facebook feed fetch failed:", fbRes.status, errBody);
    }
  } catch (err) {
    console.error("Facebook fetch error:", err);
  }

  // --- INSTAGRAM: Fetch media with comments ---
  if (fbAccount.ig_user_id) {
    try {
      const igUrl = new URL(`${META_BASE_URL}/${fbAccount.ig_user_id}/media`);
      igUrl.searchParams.set(
        "fields",
        "id,caption,comments{id,text,from,timestamp}"
      );
      igUrl.searchParams.set("limit", "25");
      igUrl.searchParams.set("access_token", fbAccount.access_token);

      const igRes = await fetch(igUrl.toString());
      if (igRes.ok) {
        const igData = await igRes.json();
        const igMedias = (igData.data || []) as IGMedia[];

        for (const media of igMedias) {
          const comments = media.comments?.data || [];
          for (const comment of comments) {
            if (!comment.id || !comment.text) continue;

            // Skip if already processed
            const { data: existing } = await supabase
              .from("comments")
              .select("id")
              .eq("meta_comment_id", comment.id)
              .limit(1)
              .single();

            if (existing) continue;

            // Skip comments from our own IG account
            if (comment.from?.id === fbAccount.ig_user_id) continue;

            // Generate AI reply
            let aiReply: string | null = null;
            let replyStatus = "pending_review";
            try {
              aiReply = await generateCommentReply({
                commentText: comment.text,
                postCaption: media.caption || null,
                orgName: org?.name || "Mon entreprise",
                orgDescription: org?.description || null,
                brandVoice: org?.brand_voice || null,
                industryName,
                commenterName: comment.from?.username || null,
              });

              if (aiReply.trim().toUpperCase() === "IGNORE") {
                replyStatus = "ignored";
                aiReply = null;
              }
            } catch (err) {
              console.error("AI reply generation failed:", err);
            }

            await supabase.from("comments").insert({
              org_id: membership.org_id,
              meta_comment_id: comment.id,
              meta_post_id: media.id,
              platform: "instagram",
              commenter_name: comment.from?.username || null,
              commenter_id: comment.from?.id || null,
              comment_text: comment.text,
              ai_reply: aiReply,
              reply_status: replyStatus,
              page_id: fbAccount.page_id,
            });

            totalNew++;
          }
        }
      } else {
        const errBody = await igRes.json().catch(() => ({}));
        console.error("Instagram media fetch failed:", igRes.status, errBody);
      }
    } catch (err) {
      console.error("Instagram fetch error:", err);
    }
  }

  return NextResponse.json({ new_comments: totalNew });
}
