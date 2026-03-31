import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateCaption } from "@/lib/ai/deepseek";
import { generateImage, buildImagePrompt } from "@/lib/ai/gemini";

export const maxDuration = 60;

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
      postTypeSlug: postType.slug,
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

    // 2. Generate image(s) with Gemini (or use source media)
    const isCarousel = postType.slug === "carousel";
    const isTextOnly = postType.slug === "text_only";
    let generatedImageUrl: string | null = sourceMediaUrl;
    let generatedImages: string[] = [];

    const imageContext = {
      caption,
      postTypeName: postType.name,
      postTypeSlug: postType.slug,
      orgName: org?.name || "Mon entreprise",
      orgDescription: org?.description || null,
      industryName: org?.industries?.name || org?.custom_industry || null,
      brandVoice: org?.brand_voice || null,
      colorPalette: org?.color_palette || null,
      services: org?.services || null,
    };

    if (!generatedImageUrl && !isTextOnly) {
      const { prompt: basePrompt, aspectRatio } = buildImagePrompt(imageContext);

      // Helper to generate one image and upload it
      async function generateAndUpload(prompt: string, ar: string): Promise<string> {
        const { base64, mimeType } = await generateImage(prompt, ar);
        const ext = mimeType.includes("png") ? "png" : "jpg";
        const storagePath = `${membership!.org_id}/generated/${crypto.randomUUID()}.${ext}`;
        const buffer = Buffer.from(base64, "base64");
        const { error: uploadError } = await supabase.storage
          .from("media")
          .upload(storagePath, buffer, { contentType: mimeType });
        if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);
        const { data: urlData } = supabase.storage
          .from("media")
          .getPublicUrl(storagePath);
        return urlData.publicUrl;
      }

      if (isCarousel) {
        // Generate multiple images in parallel with varied prompts
        const slideVariations = [
          `${basePrompt}\n\nThis is SLIDE 1 of a carousel: the eye-catching intro/hook image.`,
          `${basePrompt}\n\nThis is SLIDE 2 of a carousel: show a different angle or detail.`,
          `${basePrompt}\n\nThis is SLIDE 3 of a carousel: highlight a key benefit or feature.`,
          `${basePrompt}\n\nThis is SLIDE 4 of a carousel: the closing/call-to-action image.`,
        ];

        const results = await Promise.all(
          slideVariations.map((prompt) => generateAndUpload(prompt, aspectRatio))
        );
        generatedImages = results;
        generatedImageUrl = results[0]; // First image as thumbnail
      } else {
        generatedImageUrl = await generateAndUpload(basePrompt, aspectRatio);
      }
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
        generated_images: generatedImages.length > 0 ? generatedImages : [],
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
