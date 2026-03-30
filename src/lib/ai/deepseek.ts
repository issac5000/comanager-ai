const DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions";

type CaptionResult = {
  caption: string;
  hashtags: string[];
};

export type GenerationContext = {
  postTypeName: string;
  postTypeDescription: string | null;
  orgName: string;
  orgDescription: string | null;
  brandVoice: string | null;
  industryName: string | null;
  industryTone: string | null;
  industryHashtags: string[] | null;
  location: string | null;
  targetAudience: string | null;
  services: string[] | null;
  topicsInclude: string[] | null;
  topicsExclude: string[] | null;
};

/**
 * Generate a caption + hashtags for a social media post using DeepSeek.
 */
export async function generateCaption(
  context: GenerationContext
): Promise<CaptionResult> {
  const systemPrompt = `Tu es un expert en social media marketing. Tu génères des posts Instagram et Facebook pour des entreprises.

Règles strictes :
- Écris en français
- La légende doit faire 1 à 4 phrases, engageante et authentique
- Génère 5 à 10 hashtags pertinents (sans le #)
- Ne mets PAS de hashtags dans la légende
- 1-2 emojis max si pertinent, pas plus
- Le contenu doit être spécifique à l'entreprise, pas générique
- Réponds UNIQUEMENT en JSON valide : {"caption": "...", "hashtags": ["...", "..."]}`;

  const parts: string[] = [
    `Génère un post de type "${context.postTypeName}"${context.postTypeDescription ? ` (${context.postTypeDescription})` : ""}.`,
    "",
    `Entreprise : ${context.orgName}`,
  ];

  if (context.orgDescription) {
    parts.push(`Description : ${context.orgDescription}`);
  }
  if (context.industryName) {
    parts.push(`Secteur : ${context.industryName}`);
  }
  if (context.location) {
    parts.push(`Localisation : ${context.location}`);
  }
  if (context.services?.length) {
    parts.push(`Produits/services : ${context.services.join(", ")}`);
  }
  if (context.targetAudience) {
    parts.push(`Audience cible : ${context.targetAudience}`);
  }
  if (context.brandVoice) {
    parts.push(`Ton de la marque : ${context.brandVoice}`);
  } else if (context.industryTone) {
    parts.push(`Ton suggéré : ${context.industryTone}`);
  }
  if (context.topicsInclude?.length) {
    parts.push(`Sujets à aborder : ${context.topicsInclude.join(", ")}`);
  }
  if (context.topicsExclude?.length) {
    parts.push(`Sujets à éviter : ${context.topicsExclude.join(", ")}`);
  }
  if (context.industryHashtags?.length) {
    parts.push(
      `Hashtags du secteur (inspiration) : ${context.industryHashtags.join(", ")}`
    );
  }

  const userPrompt = parts.join("\n");

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

export type CommentReplyContext = {
  commentText: string;
  postCaption: string | null;
  orgName: string;
  orgDescription: string | null;
  brandVoice: string | null;
  industryName: string | null;
  commenterName: string | null;
};

/**
 * Generate a reply to a social media comment using DeepSeek.
 */
export async function generateCommentReply(
  context: CommentReplyContext
): Promise<string> {
  const systemPrompt = `Tu es un community manager expert. Tu rédiges des réponses aux commentaires sur les réseaux sociaux pour une entreprise.

Règles strictes :
- Écris en français
- Sois poli, professionnel et chaleureux
- La réponse doit faire 1 à 3 phrases maximum
- Adapte le ton à celui de la marque
- Si c'est un compliment, remercie sincèrement
- Si c'est une question, réponds de manière utile
- Si c'est une plainte, montre de l'empathie et propose de l'aide
- Si c'est du spam ou un commentaire inapproprié, réponds "IGNORE"
- Ne mets PAS de hashtags dans la réponse
- 1 emoji max si pertinent
- Réponds UNIQUEMENT le texte de la réponse, rien d'autre`;

  const parts: string[] = [
    `Commentaire de ${context.commenterName || "un utilisateur"} : "${context.commentText}"`,
    "",
    `Entreprise : ${context.orgName}`,
  ];

  if (context.orgDescription) {
    parts.push(`Description : ${context.orgDescription}`);
  }
  if (context.brandVoice) {
    parts.push(`Ton de la marque : ${context.brandVoice}`);
  }
  if (context.industryName) {
    parts.push(`Secteur : ${context.industryName}`);
  }
  if (context.postCaption) {
    parts.push(`\nCaption du post commenté : "${context.postCaption}"`);
  }

  const userPrompt = parts.join("\n");

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
      temperature: 0.7,
      max_tokens: 200,
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

  return content;
}
