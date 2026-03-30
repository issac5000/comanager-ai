const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-native-audio-dialog:generateContent";

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
  brandVoice: string | null;
}): string {
  return `Create a professional, visually appealing social media image for a ${context.postTypeName} post.

The image should:
- Be eye-catching and suitable for Instagram/Facebook
- Have a clean, modern aesthetic
- NOT contain any text or watermarks
- Be photorealistic or high-quality illustration style
${context.brandVoice ? `- Match this brand tone: ${context.brandVoice}` : ""}

Context of the post: ${context.caption}`;
}
