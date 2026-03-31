const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent";

/**
 * Generate an image using Gemini's native image generation.
 * Returns a base64 PNG image.
 */
export async function generateImage(prompt: string): Promise<{
  base64: string;
  mimeType: string;
}> {
  const res = await fetch(`${GEMINI_API_URL}?key=${process.env.GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        responseModalities: ["IMAGE", "TEXT"],
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gemini API error: ${body}`);
  }

  const data = await res.json();
  const parts = data.candidates?.[0]?.content?.parts;

  if (!parts || parts.length === 0) {
    throw new Error("Gemini returned no content");
  }

  // Find the image part in the response
  const imagePart = parts.find(
    (p: { inlineData?: { mimeType: string; data: string } }) => p.inlineData
  );

  if (!imagePart?.inlineData) {
    throw new Error("Gemini did not return an image");
  }

  return {
    base64: imagePart.inlineData.data,
    mimeType: imagePart.inlineData.mimeType || "image/png",
  };
}

/**
 * Build an image generation prompt from post context.
 */
export function buildImagePrompt(context: {
  caption: string;
  postTypeName: string;
  postTypeSlug: string;
  orgName: string;
  orgDescription: string | null;
  industryName: string | null;
  brandVoice: string | null;
  colorPalette: string[] | null;
  services: string[] | null;
}): string {
  const isStory = context.postTypeSlug === "story";
  const isTextOverlay = context.postTypeSlug === "text_overlay";
  const isCarousel = context.postTypeSlug === "carousel";

  const aspectRatio = isStory ? "portrait 9:16 vertical" : "square 1:1";

  const parts = [
    `Create a professional, visually appealing social media image for "${context.orgName}".`,
    "",
    "Requirements:",
    `- Eye-catching, suitable for Instagram/Facebook (${aspectRatio} ratio)`,
    "- Clean, modern aesthetic",
    "- Photorealistic or high-quality style",
  ];

  if (isTextOverlay) {
    parts.push("- Include stylized text overlay with the key message from the caption");
    parts.push("- Use bold, readable typography that stands out against the background");
  } else {
    parts.push("- Do NOT include any text, watermarks, or logos");
  }

  if (isStory) {
    parts.push("- IMPORTANT: Generate a VERTICAL image (taller than wide, 9:16 portrait orientation)");
    parts.push("- Dynamic, attention-grabbing composition suited for stories");
  }

  if (isCarousel) {
    parts.push("- Create a single compelling hero image that introduces the carousel theme");
  }

  if (context.orgDescription) {
    parts.push(`- The business is: ${context.orgDescription}`);
  }
  if (context.industryName) {
    parts.push(`- Industry: ${context.industryName}`);
  }
  if (context.services?.length) {
    parts.push(`- Products/services to feature: ${context.services.join(", ")}`);
  }
  if (context.colorPalette?.length) {
    parts.push(`- Use these brand colors as accents if possible: ${context.colorPalette.join(", ")}`);
  }
  if (context.brandVoice) {
    parts.push(`- Visual mood should match this tone: ${context.brandVoice}`);
  }

  parts.push("", `Post type: ${context.postTypeName}`);
  parts.push(`Post caption (for context): ${context.caption}`);

  return parts.join("\n");
}
