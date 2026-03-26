import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { publishToFacebook, publishToInstagram } from "@/lib/meta/api";

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

  const { post_id } = await request.json();
  if (!post_id) {
    return NextResponse.json({ error: "post_id requis" }, { status: 400 });
  }

  // Get the post
  const { data: post, error: postError } = await supabase
    .from("posts")
    .select("*")
    .eq("id", post_id)
    .eq("org_id", membership.org_id)
    .single();

  if (postError || !post) {
    return NextResponse.json({ error: "Post non trouvé" }, { status: 404 });
  }

  if (post.status !== "approved") {
    return NextResponse.json(
      { error: "Le post doit être approuvé pour être publié" },
      { status: 400 }
    );
  }

  if (!post.generated_image_url) {
    return NextResponse.json(
      { error: "Le post n'a pas d'image générée" },
      { status: 400 }
    );
  }

  // Build the full caption
  const caption = [
    post.caption || "",
    post.hashtags?.map((h: string) => `#${h}`).join(" ") || "",
  ]
    .filter(Boolean)
    .join("\n\n");

  // Get connected accounts
  const { data: accounts } = await supabase
    .from("connected_accounts")
    .select("*")
    .eq("org_id", membership.org_id);

  if (!accounts || accounts.length === 0) {
    return NextResponse.json(
      { error: "Aucun compte connecté" },
      { status: 400 }
    );
  }

  const results: { platform: string; success: boolean; error?: string }[] = [];

  // Publish to Facebook pages
  const fbAccounts = accounts.filter(
    (a) => a.platform === "facebook" && a.page_id && a.access_token
  );

  for (const fb of fbAccounts) {
    try {
      await publishToFacebook(
        fb.page_id!,
        fb.access_token!,
        post.generated_image_url,
        caption
      );
      results.push({ platform: `facebook:${fb.page_name}`, success: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      results.push({
        platform: `facebook:${fb.page_name}`,
        success: false,
        error: message,
      });
    }
  }

  // Publish to Instagram accounts
  const igAccounts = accounts.filter(
    (a) => a.platform === "instagram" && a.ig_user_id && a.access_token
  );

  for (const ig of igAccounts) {
    try {
      await publishToInstagram(
        ig.ig_user_id!,
        ig.access_token!,
        post.generated_image_url,
        caption
      );
      results.push({ platform: `instagram:${ig.ig_username}`, success: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      results.push({
        platform: `instagram:${ig.ig_username}`,
        success: false,
        error: message,
      });
    }
  }

  // Update post status
  const anySuccess = results.some((r) => r.success);
  const allFailed = results.every((r) => !r.success);

  if (anySuccess) {
    await supabase
      .from("posts")
      .update({
        status: "published",
        published_at: new Date().toISOString(),
      })
      .eq("id", post_id);
  } else if (allFailed) {
    await supabase
      .from("posts")
      .update({ status: "failed" })
      .eq("id", post_id);
  }

  return NextResponse.json({ results });
}
