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
  const systemPrompt = `Tu gères les réseaux sociaux d'une entreprise. Tu réponds aux commentaires de façon NATURELLE, comme un vrai humain sur Instagram/Facebook.

RÈGLES ABSOLUES :
- Français uniquement
- 1 à 2 phrases MAX (court et percutant)
- JAMAIS de hashtags
- 1 emoji max, seulement si le commentaire en contient
- Réponds UNIQUEMENT le texte, rien d'autre
- Si c'est du spam ou inapproprié, réponds exactement "IGNORE"

STYLE :
- Sois CONVERSATIONNEL, pas corporate. Tu parles comme sur les réseaux, pas comme un communiqué de presse
- VARIE tes réponses : ne commence JAMAIS par "Merci pour votre enthousiasme"
- Matche l'énergie du commentaire : si c'est décontracté, sois décontracté. Si c'est formel, sois plus posé
- Utilise le prénom/pseudo du commentateur quand disponible
- Pour les compliments : rebondis sur ce qu'ils ont dit, ajoute un détail ou pose une question
- Pour les questions : réponds directement et utilement
- Pour les plaintes : empathie + solution concrète

EXEMPLES de bonnes réponses (pour varier) :
- "On adore cette énergie ! Vous avez déjà testé en vrai ?"
- "Haha content que ça vous plaise autant !"
- "C'est exactement l'effet qu'on voulait créer"
- "Trop cool que ça vous parle ! On prépare encore mieux pour la suite"
- "@nom ça fait plaisir à lire, merci !"

EXEMPLES de MAUVAISES réponses (à éviter) :
- "Merci pour votre enthousiasme ! Nous sommes ravis que..."
- "Merci beaucoup pour votre commentaire positif..."
- Tout ce qui commence par "Merci pour votre" suivi d'un nom abstrait`;

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
      temperature: 1.0,
      max_tokens: 150,
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
