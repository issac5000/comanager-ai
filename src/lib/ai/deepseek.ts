const DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions";

type CaptionResult = {
  caption: string;
  hashtags: string[];
};

/**
 * Generate a caption + hashtags for a social media post using DeepSeek.
 */
export async function generateCaption(context: {
  postTypeName: string;
  postTypeDescription: string | null;
  brandVoice: string | null;
  industryTone: string | null;
  industryHashtags: string[] | null;
  topicsInclude: string[] | null;
  topicsExclude: string[] | null;
  language?: string;
}): Promise<CaptionResult> {
  const systemPrompt = `Tu es un expert en social media marketing. Tu génères des posts pour les réseaux sociaux (Instagram et Facebook).

Règles :
- Écris en ${context.language || "français"}
- Le post doit être engageant, authentique et adapté au ton de la marque
- La légende doit faire entre 1 et 4 phrases maximum
- Génère 5 à 10 hashtags pertinents (sans le #)
- Ne mets PAS de hashtags dans la légende, ils seront ajoutés séparément
- Ne mets PAS d'emojis excessifs, 1-2 max si pertinent
- Réponds UNIQUEMENT en JSON valide, sans markdown ni backticks`;

  const userPrompt = `Génère un post de type "${context.postTypeName}"${context.postTypeDescription ? ` (${context.postTypeDescription})` : ""}.

${context.brandVoice ? `Voix de marque : ${context.brandVoice}` : ""}
${context.industryTone ? `Ton du secteur : ${context.industryTone}` : ""}
${context.topicsInclude?.length ? `Sujets à aborder : ${context.topicsInclude.join(", ")}` : ""}
${context.topicsExclude?.length ? `Sujets à éviter : ${context.topicsExclude.join(", ")}` : ""}
${context.industryHashtags?.length ? `Hashtags du secteur (tu peux t'en inspirer) : ${context.industryHashtags.join(", ")}` : ""}

Réponds en JSON : {"caption": "...", "hashtags": ["mot1", "mot2", ...]}`;

  const res = await fetch(DEEPSEEK_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.8,
      max_tokens: 500,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`DeepSeek API error: ${body}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content?.trim();

  if (!content) {
    throw new Error("DeepSeek returned empty response");
  }

  // Parse JSON response, handling potential markdown wrapping
  const jsonStr = content.replace(/^```json?\s*/, "").replace(/\s*```$/, "");
  const parsed = JSON.parse(jsonStr) as CaptionResult;

  if (!parsed.caption || !Array.isArray(parsed.hashtags)) {
    throw new Error(`Invalid DeepSeek response format: ${content}`);
  }

  // Clean hashtags (remove # if DeepSeek added them)
  parsed.hashtags = parsed.hashtags.map((h) => h.replace(/^#/, ""));

  return parsed;
}
