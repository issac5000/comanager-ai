import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateCaption } from "@/lib/ai/deepseek";
import { generateImage, buildImagePrompt } from "@/lib/ai/gemini";

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

  const { post_type_id, source_media_id } = await request.json();

  if (!post_type_id) {
    return NextResponse.json(
      { error: "post_type_id requis" },
      { status: 400 }
    );
  }

  // Fetch all context in parallel
  const [orgResult, postTypeResult, industryResult] = await Promise.all([
    supabase
      .from("organizations")
      .select("brand_voice, industry_id, topics_include, topics_exclude")
      .eq("id", membership.org_id)
      .single(),
    supabase.from("post_types").select("name, slug, description").eq("id", post_type_id).single(),
    // Get industry through org
    supabase
      .from("organizations")
      .select("industries(name, default_tone, default_hashtags)")
      .eq("id", membership.org_id)
      .single(),
  ]);

  const org = orgResult.data;
  const postType = postTypeResult.data;

  if (!postType) {
    return NextResponse.json(
      { error: "Type de post non trouvé" },
      { status: 404 }
    );
  }

  const industry = (industryResult.data as unknown as {
    industries: { name: string; default_tone: string | null; default_hashtags: string[] | null } | null;
  })?.industries;

  // If source_media_id provided, get the media URL
  let sourceMediaUrl: string | null = null;
  if (source_media_id) {
    const { data: media } = await supabase
      .from("media")
      .select("storage_path")
      .eq("id", source_media_id)
      .eq("org_id", membership.org_id)
      .single();

    if (media?.storage_path) {
      const { data: urlData } = supabase.storage
        .from("media")
        .getPublicUrl(media.storage_path);
      sourceMediaUrl = urlData.publicUrl;
    }
  }

  try {
    // 1. Generate caption + hashtags with DeepSeek
    const { caption, hashtags } = await generateCaption({
      postTypeName: postType.name,
      postTypeDescription: postType.description,
      brandVoice: org?.brand_voice || null,
      industryTone: industry?.default_tone || null,
      industryHashtags: industry?.default_hashtags || null,
      topicsInclude: org?.topics_include || null,
      topicsExclude: org?.topics_exclude || null,
    });

    // 2. Generate image with Gemini (or use source media)
    let generatedImageUrl = sourceMediaUrl;

    if (!generatedImageUrl) {
      const imagePrompt = buildImagePrompt({
        caption,
        postTypeName: postType.name,
        brandVoice: org?.brand_voice || null,
      });

      const { base64, mimeType } = await generateImage(imagePrompt);

      // Upload to Supabase Storage
      const ext = mimeType.includes("png") ? "png" : "jpg";
      const storagePath = `${membership.org_id}/generated/${crypto.randomUUID()}.${ext}`;

      const buffer = Buffer.from(base64, "base64");
      const { error: uploadError } = await supabase.storage
        .from("media")
        .upload(storagePath, buffer, { contentType: mimeType });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      const { data: urlData } = supabase.storage
        .from("media")
        .getPublicUrl(storagePath);
      generatedImageUrl = urlData.publicUrl;
    }

    // 3. Create the post
    const { data: post, error: insertError } = await supabase
      .from("posts")
      .insert({
        org_id: membership.org_id,
        post_type_id,
        caption,
        hashtags,
        generated_image_url: generatedImageUrl,
        platforms: ["facebook", "instagram"],
        status: "pending_review",
        source_media_id: source_media_id || null,
      })
      .select("id")
      .single();

    if (insertError) {
      throw new Error(`Insert failed: ${insertError.message}`);
    }

    return NextResponse.json({ post_id: post.id, caption, hashtags });
  } catch (err) {
    console.error("Post generation error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Échec de la génération : ${message}` },
      { status: 500 }
    );
  }
}
