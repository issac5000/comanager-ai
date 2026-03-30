"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Send, Copy, Download, Check, AlertCircle, RefreshCw, Sparkles, Loader2, X } from "lucide-react";

type PublishResult = {
  platform: string;
  success: boolean;
  error?: string;
};

type PublishFeedback = {
  postId: string;
  type: "success" | "partial" | "error";
  message: string;
};

type PostType = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
};

type Post = {
  id: string;
  caption: string | null;
  hashtags: string[] | null;
  platforms: string[] | null;
  status: string | null;
  scheduled_for: string | null;
  published_at: string | null;
  created_at: string | null;
  generated_image_url: string | null;
  post_types: { name: string; slug: string } | null;
};

const STATUS_LABELS: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  generating: { label: "G\u00e9n\u00e9ration...", variant: "secondary" },
  pending_review: { label: "\u00c0 valider", variant: "default" },
  approved: { label: "Approuv\u00e9", variant: "outline" },
  published: { label: "Publi\u00e9", variant: "default" },
  rejected: { label: "Rejet\u00e9", variant: "destructive" },
  failed: { label: "\u00c9chou\u00e9", variant: "destructive" },
};

const FILTERS = [
  { value: "all", label: "Tous" },
  { value: "pending_review", label: "\u00c0 valider" },
  { value: "approved", label: "Approuv\u00e9s" },
  { value: "published", label: "Publi\u00e9s" },
  { value: "rejected", label: "Rejet\u00e9s" },
];

export default function PostsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [filter, setFilter] = useState("all");
  const [orgId, setOrgId] = useState<string | null>(null);
  const [hasConnectedAccounts, setHasConnectedAccounts] = useState(false);
  const [publishing, setPublishing] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<PublishFeedback | null>(null);
  const [postTypes, setPostTypes] = useState<PostType[]>([]);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [expandedCaptions, setExpandedCaptions] = useState<Set<string>>(new Set());
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const supabase = createClient();

  const loadPosts = useCallback(async () => {
    if (!orgId) return;
    let query = supabase
      .from("posts")
      .select("*, post_types(name, slug)")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });

    if (filter !== "all") {
      query = query.eq("status", filter);
    }

    const { data } = await query;
    if (data) setPosts(data as unknown as Post[]);
  }, [orgId, filter, supabase]);

  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: membership } = await supabase
        .from("organization_members")
        .select("org_id")
        .eq("user_id", user.id)
        .limit(1)
        .single();

      if (membership?.org_id) {
        setOrgId(membership.org_id);

        // Load connected accounts and post types in parallel
        const [accountsResult, typesResult] = await Promise.all([
          supabase
            .from("connected_accounts")
            .select("id", { count: "exact", head: true })
            .eq("org_id", membership.org_id),
          supabase.from("post_types").select("id, name, slug, description"),
        ]);

        setHasConnectedAccounts((accountsResult.count ?? 0) > 0);
        if (typesResult.data) setPostTypes(typesResult.data);
      }
    }
    init();
  }, [supabase]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  async function handleApprove(postId: string) {
    await supabase
      .from("posts")
      .update({ status: "approved" })
      .eq("id", postId);
    loadPosts();
  }

  async function handleReject(postId: string) {
    await supabase
      .from("posts")
      .update({ status: "rejected" })
      .eq("id", postId);
    loadPosts();
  }

  async function handleGenerate(postTypeId: string) {
    setGenerating(true);
    setGenerateError(null);
    try {
      const res = await fetch("/api/posts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ post_type_id: postTypeId }),
      });
      const data = await res.json();

      if (!res.ok) {
        setGenerateError(data.error || "Erreur lors de la g\u00e9n\u00e9ration");
        return;
      }

      loadPosts();
    } catch {
      setGenerateError("Erreur r\u00e9seau. V\u00e9rifiez votre connexion.");
    } finally {
      setGenerating(false);
    }
  }

  async function handlePublish(postId: string) {
    setPublishing(postId);
    setFeedback(null);
    try {
      const res = await fetch("/api/meta/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ post_id: postId }),
      });
      const data = await res.json();

      if (!res.ok) {
        setFeedback({
          postId,
          type: "error",
          message: data.error || "Erreur lors de la publication",
        });
        return;
      }

      const results = data.results as PublishResult[];
      const successes = results.filter((r) => r.success);
      const failures = results.filter((r) => !r.success);

      if (failures.length === 0) {
        setFeedback({
          postId,
          type: "success",
          message: `Publi\u00e9 sur ${successes.map((r) => r.platform.split(":")[0]).join(" et ")}`,
        });
      } else if (successes.length > 0) {
        setFeedback({
          postId,
          type: "partial",
          message: `Publi\u00e9 sur ${successes.map((r) => r.platform.split(":")[0]).join(", ")}. \u00c9chec sur ${failures.map((r) => r.platform.split(":")[0]).join(", ")}`,
        });
      } else {
        setFeedback({
          postId,
          type: "error",
          message: `\u00c9chec : ${failures[0]?.error || "Erreur inconnue"}`,
        });
      }
      loadPosts();
    } catch {
      setFeedback({
        postId,
        type: "error",
        message: "Erreur r\u00e9seau. V\u00e9rifiez votre connexion.",
      });
    } finally {
      setPublishing(null);
    }
  }

  function handleCopyCaption(post: Post) {
    const text = [
      post.caption || "",
      post.hashtags?.map((h) => `#${h}`).join(" ") || "",
    ]
      .filter(Boolean)
      .join("\n\n");

    navigator.clipboard.writeText(text);
    setCopied(post.id);
    setTimeout(() => setCopied(null), 2000);
  }

  async function handleDownloadImage(post: Post) {
    if (!post.generated_image_url) return;
    try {
      const res = await fetch(post.generated_image_url);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `post-${post.id}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // Fallback: open in new tab
      window.open(post.generated_image_url, "_blank");
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Publications</h1>
        <p className="text-muted-foreground">
          G&eacute;rez et validez vos posts g&eacute;n&eacute;r&eacute;s par l&apos;IA
        </p>
      </div>

      {/* Generate post */}
      {postTypes.length > 0 && (
        <Card className="mb-6">
          <CardContent className="flex flex-col gap-3 p-4">
            <p className="text-sm font-medium">G&eacute;n&eacute;rer un nouveau post</p>
            {generateError && (
              <div className="text-xs p-2 rounded bg-red-50 text-red-700 border border-red-200">
                <AlertCircle className="h-3 w-3 inline mr-1" />
                {generateError}
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {postTypes.map((pt) => (
                <Button
                  key={pt.id}
                  size="sm"
                  variant="outline"
                  disabled={generating}
                  onClick={() => handleGenerate(pt.id)}
                >
                  {generating ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-1" />
                  )}
                  {pt.name}
                </Button>
              ))}
            </div>
            {generating && (
              <p className="text-xs text-muted-foreground">
                G&eacute;n&eacute;ration en cours (caption + image)... Cela peut prendre 15-30s.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {FILTERS.map((f) => (
          <Button
            key={f.value}
            variant={filter === f.value ? "default" : "outline"}
            size="sm"
            className="shrink-0"
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {posts.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12 text-center">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="font-semibold text-lg mb-2">Aucun post</h3>
          <p className="text-muted-foreground">
            {filter === "all"
              ? "Les posts g\u00e9n\u00e9r\u00e9s par l'IA appara\u00eetront ici."
              : "Aucun post avec ce statut."}
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <Card key={post.id}>
              {post.generated_image_url && (
                <div
                  className="aspect-square overflow-hidden rounded-t-lg cursor-pointer"
                  onClick={() => setLightboxUrl(post.generated_image_url)}
                >
                  <img
                    src={post.generated_image_url}
                    alt="Post"
                    className="h-full w-full object-cover hover:scale-105 transition-transform duration-200"
                  />
                </div>
              )}
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">
                    {post.post_types?.name || "Post"}
                  </CardTitle>
                  {post.status && STATUS_LABELS[post.status] && (
                    <Badge variant={STATUS_LABELS[post.status].variant}>
                      {STATUS_LABELS[post.status].label}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {post.caption && (
                  <p
                    className={`text-sm text-muted-foreground mb-3 cursor-pointer ${
                      expandedCaptions.has(post.id) ? "" : "line-clamp-3"
                    }`}
                    onClick={() => {
                      setExpandedCaptions((prev) => {
                        const next = new Set(prev);
                        if (next.has(post.id)) next.delete(post.id);
                        else next.add(post.id);
                        return next;
                      });
                    }}
                  >
                    {post.caption}
                  </p>
                )}
                {post.hashtags && post.hashtags.length > 0 && (
                  <p className="text-xs text-blue-600 mb-3">
                    {post.hashtags.map((h) => `#${h}`).join(" ")}
                  </p>
                )}
                {post.platforms && post.platforms.length > 0 && (
                  <div className="flex gap-1 mb-3">
                    {post.platforms.map((p) => (
                      <Badge key={p} variant="outline" className="text-xs">
                        {p}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Approve / Reject buttons */}
                {post.status === "pending_review" && (
                  <div className="flex gap-2 mb-2">
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => handleApprove(post.id)}
                    >
                      Approuver
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleReject(post.id)}
                    >
                      Rejeter
                    </Button>
                  </div>
                )}

                {/* Publish feedback */}
                {feedback?.postId === post.id && (
                  <div
                    className={`text-xs p-2 rounded mb-2 ${
                      feedback.type === "success"
                        ? "bg-green-50 text-green-700 border border-green-200"
                        : feedback.type === "partial"
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : "bg-red-50 text-red-700 border border-red-200"
                    }`}
                  >
                    {feedback.type === "error" && (
                      <AlertCircle className="h-3 w-3 inline mr-1" />
                    )}
                    {feedback.message}
                  </div>
                )}

                {/* Publish / Copy / Download buttons for approved posts */}
                {post.status === "approved" && (
                  <div className="flex flex-col gap-2">
                    {hasConnectedAccounts && (
                      <Button
                        size="sm"
                        onClick={() => handlePublish(post.id)}
                        disabled={publishing === post.id}
                      >
                        <Send className="h-4 w-4 mr-1" />
                        {publishing === post.id
                          ? "Publication..."
                          : "Publier maintenant"}
                      </Button>
                    )}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => handleCopyCaption(post)}
                      >
                        {copied === post.id ? (
                          <Check className="h-4 w-4 mr-1" />
                        ) : (
                          <Copy className="h-4 w-4 mr-1" />
                        )}
                        {copied === post.id ? "Copi\u00e9 !" : "Copier la l\u00e9gende"}
                      </Button>
                      {post.generated_image_url && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => handleDownloadImage(post)}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          T&eacute;l&eacute;charger
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {/* Retry button for failed posts */}
                {post.status === "failed" && (
                  <div className="flex flex-col gap-2">
                    {hasConnectedAccounts && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={async () => {
                          await supabase
                            .from("posts")
                            .update({ status: "approved" })
                            .eq("id", post.id);
                          await loadPosts();
                          handlePublish(post.id);
                        }}
                        disabled={publishing === post.id}
                      >
                        <RefreshCw className="h-4 w-4 mr-1" />
                        {publishing === post.id ? "Publication..." : "R\u00e9essayer"}
                      </Button>
                    )}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => handleCopyCaption(post)}
                      >
                        {copied === post.id ? (
                          <Check className="h-4 w-4 mr-1" />
                        ) : (
                          <Copy className="h-4 w-4 mr-1" />
                        )}
                        {copied === post.id ? "Copi\u00e9 !" : "Copier"}
                      </Button>
                      {post.generated_image_url && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => handleDownloadImage(post)}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          T&eacute;l&eacute;charger
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {/* Copy / Download for published posts too */}
                {post.status === "published" && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleCopyCaption(post)}
                    >
                      {copied === post.id ? (
                        <Check className="h-4 w-4 mr-1" />
                      ) : (
                        <Copy className="h-4 w-4 mr-1" />
                      )}
                      {copied === post.id ? "Copi\u00e9 !" : "Copier"}
                    </Button>
                    {post.generated_image_url && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => handleDownloadImage(post)}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        T&eacute;l&eacute;charger
                      </Button>
                    )}
                  </div>
                )}

                {post.scheduled_for && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Planifi&eacute; :{" "}
                    {new Date(post.scheduled_for).toLocaleDateString("fr-FR")}
                  </p>
                )}
                {post.published_at && post.status === "published" && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Publi&eacute; le{" "}
                    {new Date(post.published_at).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Image lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-gray-300"
            onClick={() => setLightboxUrl(null)}
          >
            <X className="h-8 w-8" />
          </button>
          <img
            src={lightboxUrl}
            alt="Post en grand"
            className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
