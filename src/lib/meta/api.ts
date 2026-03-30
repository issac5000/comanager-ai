const META_API_VERSION = "v22.0";
const META_BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;

export type MetaPage = {
  id: string;
  name: string;
  access_token: string;
};

export type InstagramAccount = {
  id: string;
  username: string;
};

/**
 * Exchange the short-lived code for a short-lived user access token.
 */
export async function exchangeCodeForToken(
  code: string,
  redirectUri?: string
): Promise<{ access_token: string; expires_in: number }> {
  const url = new URL(`${META_BASE_URL}/oauth/access_token`);
  url.searchParams.set("client_id", process.env.META_APP_ID!);
  url.searchParams.set("client_secret", process.env.META_APP_SECRET!);
  if (redirectUri) {
    url.searchParams.set("redirect_uri", redirectUri);
  }
  url.searchParams.set("code", code);

  const res = await fetch(url.toString());
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Meta token exchange failed: ${body}`);
  }
  return res.json();
}

/**
 * Exchange a short-lived token for a long-lived user token (~60 days).
 */
export async function getLongLivedUserToken(
  shortLivedToken: string
): Promise<{ access_token: string; expires_in: number }> {
  const url = new URL(`${META_BASE_URL}/oauth/access_token`);
  url.searchParams.set("grant_type", "fb_exchange_token");
  url.searchParams.set("client_id", process.env.META_APP_ID!);
  url.searchParams.set("client_secret", process.env.META_APP_SECRET!);
  url.searchParams.set("fb_exchange_token", shortLivedToken);

  const res = await fetch(url.toString());
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Meta long-lived token exchange failed: ${body}`);
  }
  return res.json();
}

/**
 * Get the Facebook Pages the user manages.
 * Page tokens returned here are long-lived (never expire) when the user token is long-lived.
 */
export async function getUserPages(
  userAccessToken: string
): Promise<MetaPage[]> {
  const url = new URL(`${META_BASE_URL}/me/accounts`);
  url.searchParams.set("access_token", userAccessToken);
  url.searchParams.set("fields", "id,name,access_token");

  const res = await fetch(url.toString());
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Meta get pages failed: ${body}`);
  }
  const data = await res.json();
  return (data.data || []) as MetaPage[];
}

/**
 * Check if a Facebook Page has an Instagram Business account linked.
 */
export async function getInstagramAccount(
  pageId: string,
  pageAccessToken: string
): Promise<InstagramAccount | null> {
  const url = new URL(`${META_BASE_URL}/${pageId}`);
  url.searchParams.set("fields", "instagram_business_account");
  url.searchParams.set("access_token", pageAccessToken);

  const res = await fetch(url.toString());
  if (!res.ok) return null;

  const data = await res.json();
  if (!data.instagram_business_account?.id) return null;

  // Fetch username
  const igId = data.instagram_business_account.id;
  const igUrl = new URL(`${META_BASE_URL}/${igId}`);
  igUrl.searchParams.set("fields", "username");
  igUrl.searchParams.set("access_token", pageAccessToken);

  const igRes = await fetch(igUrl.toString());
  if (!igRes.ok) return { id: igId, username: "" };

  const igData = await igRes.json();
  return { id: igId, username: igData.username || "" };
}

/**
 * Publish a photo post to a Facebook Page.
 */
export async function publishToFacebook(
  pageId: string,
  pageAccessToken: string,
  imageUrl: string,
  message: string
): Promise<{ id: string }> {
  const url = new URL(`${META_BASE_URL}/${pageId}/photos`);

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: imageUrl,
      message,
      access_token: pageAccessToken,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Facebook publish failed: ${body}`);
  }
  return res.json();
}

/**
 * Publish a photo post to Instagram (2-step: create container, then publish).
 */
export async function publishToInstagram(
  igUserId: string,
  pageAccessToken: string,
  imageUrl: string,
  caption: string
): Promise<{ id: string }> {
  // Step 1: Create media container
  const containerUrl = new URL(`${META_BASE_URL}/${igUserId}/media`);
  const containerRes = await fetch(containerUrl.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      image_url: imageUrl,
      caption,
      access_token: pageAccessToken,
    }),
  });

  if (!containerRes.ok) {
    const body = await containerRes.text();
    throw new Error(`Instagram container creation failed: ${body}`);
  }

  const { id: containerId } = await containerRes.json();

  // Step 2: Publish the container
  const publishUrl = new URL(`${META_BASE_URL}/${igUserId}/media_publish`);
  const publishRes = await fetch(publishUrl.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      creation_id: containerId,
      access_token: pageAccessToken,
    }),
  });

  if (!publishRes.ok) {
    const body = await publishRes.text();
    throw new Error(`Instagram publish failed: ${body}`);
  }
  return publishRes.json();
}

/**
 * Subscribe a Facebook Page to webhook events (feed/comments).
 * Must be called after OAuth with the page access token.
 */
export async function subscribePageToWebhooks(
  pageId: string,
  pageAccessToken: string
): Promise<void> {
  const url = new URL(`${META_BASE_URL}/${pageId}/subscribed_apps`);
  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      subscribed_fields: "feed",
      access_token: pageAccessToken,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`Webhook subscription failed for page ${pageId}:`, body);
  }
}

/**
 * Reply to a Facebook comment.
 */
export async function replyToComment(
  commentId: string,
  message: string,
  pageAccessToken: string
): Promise<{ id: string }> {
  const url = new URL(`${META_BASE_URL}/${commentId}/comments`);
  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      access_token: pageAccessToken,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Reply to comment failed: ${body}`);
  }
  return res.json();
}

/**
 * Get details of a specific comment by ID.
 */
export async function getCommentDetails(
  commentId: string,
  pageAccessToken: string
): Promise<{ id: string; message: string; from?: { id: string; name: string } } | null> {
  const url = new URL(`${META_BASE_URL}/${commentId}`);
  url.searchParams.set("fields", "id,message,from");
  url.searchParams.set("access_token", pageAccessToken);

  const res = await fetch(url.toString());
  if (!res.ok) return null;
  return res.json();
}
