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
    return NextResponse.json({ error: "Non authentifi\u00e9" }, { status: 401 });
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
  const [orgResult, postTypeResult] = await Promise.all([
    supabase
      .from("organizations")
      .select(
        "name, description, brand_voice, industry_id, website, location, target_audience, services, color_palette, topics_include, topics_exclude, custom_industry, industries(name, default_tone, default_hashtags)"
      )
      .eq("id", membership.org_id)
      .single(),
    supabase
      .from("post_types")
      .select("name, slug, description")
      .eq("id", post_type_id)
      .single(),
  ]);

  const org = orgResult.data as unknown as {
    name: string;
    description: string | null;
    brand_voice: string | null;
    industry_id: string | null;
    website: string | null;
    location: string | null;
    target_audience: string | null;
    services: string[] | null;
    color_palette: string[] | null;
    topics_include: string[] | null;
    topics_exclude: string[] | null;
    custom_industry: string | null;
    industries: {
      name: string;
      default_tone: string | null;
      default_hashtags: string[] | null;
    } | null;
  } | null;

  const postType = postTypeResult.data;

  if (!postType) {
    return NextResponse.json(
      { error: "Type de post non trouv\u00e9" },
      { status: 404 }
    );
  }

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
      orgName: org?.name || "Mon entreprise",
      orgDescription: org?.description || null,
      brandVoice: org?.brand_voice || null,
      industryName: org?.industries?.name || org?.custom_industry || null,
      industryTone: org?.industries?.default_tone || null,
      industryHashtags: org?.industries?.default_hashtags || null,
      location: org?.location || null,
      targetAudience: org?.target_audience || null,
      services: org?.services || null,
      topicsInclude: org?.topics_include || null,
      topicsExclude: org?.topics_exclude || null,
    });

    // 2. Generate image with Gemini (or use source media)
    let generatedImageUrl = sourceMediaUrl;

    if (!generatedImageUrl) {
      const imagePrompt = buildImagePrompt({
        caption,
        postTypeName: postType.name,
        orgName: org?.name || "Mon entreprise",
        orgDescription: org?.description || null,
        industryName: org?.industries?.name || org?.custom_industry || null,
        brandVoice: org?.brand_voice || null,
        colorPalette: org?.color_palette || null,
        services: org?.services || null,
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
      { error: `\u00c9chec de la g\u00e9n\u00e9ration : ${message}` },
      { status: 500 }
    );
  }
}
