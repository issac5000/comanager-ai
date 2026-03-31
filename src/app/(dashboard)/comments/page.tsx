"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  MessageCircle,
  Send,
  Check,
  X,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  RefreshCw,
} from "lucide-react";

type Comment = {
  id: string;
  meta_comment_id: string;
  platform: string;
  commenter_name: string | null;
  comment_text: string;
  ai_reply: string | null;
  reply_status: string;
  meta_reply_id: string | null;
  created_at: string | null;
  replied_at: string | null;
  page_id: string | null;
  posts: { caption: string | null; post_types: { name: string } | null } | null;
};

const STATUS_LABELS: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  pending_review: { label: "En attente", variant: "default" },
  published: { label: "R\u00e9pondu", variant: "outline" },
  ignored: { label: "Ignor\u00e9", variant: "secondary" },
  rejected: { label: "Rejet\u00e9", variant: "destructive" },
};

const FILTERS = [
  { value: "all", label: "Tous" },
  { value: "pending_review", label: "En attente" },
  { value: "published", label: "R\u00e9pondus" },
  { value: "ignored", label: "Ignor\u00e9s" },
];

export default function CommentsPage() {
  const [comments, setComments] = useState<Comment[]>([]);
  const [filter, setFilter] = useState("all");
  const [orgId, setOrgId] = useState<string | null>(null);
  const [sending, setSending] = useState<string | null>(null);
  const [editingReply, setEditingReply] = useState<string | null>(null);
  const [editedText, setEditedText] = useState("");
  const [feedback, setFeedback] = useState<{
    commentId: string;
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [fetching, setFetching] = useState(false);
  const [fetchResult, setFetchResult] = useState<string | null>(null);
  const supabase = createClient();

  const loadComments = useCallback(async () => {
    if (!orgId) return;

    let query = supabase
      .from("comments")
      .select("*, posts(caption, post_types(name))")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });

    if (filter !== "all") {
      query = query.eq("reply_status", filter);
    }

    const { data } = await query;
    if (data) setComments(data as unknown as Comment[]);
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
      }
    }
    init();
  }, [supabase]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  async function handleSendReply(comment: Comment, replyText: string) {
    setSending(comment.id);
    setFeedback(null);

    try {
      const res = await fetch("/api/meta/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comment_id: comment.id,
          reply_text: replyText,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setFeedback({
          commentId: comment.id,
          type: "error",
          message: data.error || "Erreur lors de l'envoi",
        });
        return;
      }

      setFeedback({
        commentId: comment.id,
        type: "success",
        message: "R\u00e9ponse envoy\u00e9e !",
      });
      setEditingReply(null);
      loadComments();
    } catch {
      setFeedback({
        commentId: comment.id,
        type: "error",
        message: "Erreur r\u00e9seau",
      });
    } finally {
      setSending(null);
    }
  }

  async function handleIgnore(commentId: string) {
    await supabase
      .from("comments")
      .update({ reply_status: "ignored" })
      .eq("id", commentId);
    loadComments();
  }

  async function handleReject(commentId: string) {
    await supabase
      .from("comments")
      .update({ reply_status: "rejected" })
      .eq("id", commentId);
    loadComments();
  }

  async function handleFetchComments() {
    setFetching(true);
    setFetchResult(null);
    try {
      const res = await fetch("/api/meta/fetch-comments", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setFetchResult(data.error || "Erreur");
      } else if (data.new_comments === 0) {
        setFetchResult("Aucun nouveau commentaire");
      } else {
        setFetchResult(`${data.new_comments} nouveau(x) commentaire(s) !`);
        loadComments();
      }
    } catch {
      setFetchResult("Erreur r\u00e9seau");
    } finally {
      setFetching(false);
      setTimeout(() => setFetchResult(null), 4000);
    }
  }

  return (
    <div>
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Commentaires</h1>
          <p className="text-muted-foreground">
            G&eacute;rez les commentaires et les r&eacute;ponses g&eacute;n&eacute;r&eacute;es par l&apos;IA
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Button size="sm" variant="outline" onClick={handleFetchComments} disabled={fetching}>
            {fetching ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-1" />
            )}
            {fetching ? "Recherche..." : "Rafra\u00eechir"}
          </Button>
          {fetchResult && (
            <span className="text-xs text-muted-foreground">{fetchResult}</span>
          )}
        </div>
      </div>

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

      {comments.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12 text-center">
          <MessageCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="font-semibold text-lg mb-2">Aucun commentaire</h3>
          <p className="text-muted-foreground">
            {filter === "all"
              ? "Les commentaires de vos publications appara\u00eetront ici automatiquement."
              : "Aucun commentaire avec ce statut."}
          </p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {comments.map((comment) => (
            <Card key={comment.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-sm font-medium">
                      {comment.commenter_name || "Utilisateur"}
                    </CardTitle>
                    <Badge variant="outline" className="text-xs">
                      {comment.platform}
                    </Badge>
                    {comment.posts?.post_types?.name && (
                      <Badge variant="secondary" className="text-xs">
                        {comment.posts.post_types.name}
                      </Badge>
                    )}
                  </div>
                  {STATUS_LABELS[comment.reply_status] && (
                    <Badge
                      variant={STATUS_LABELS[comment.reply_status].variant}
                    >
                      {STATUS_LABELS[comment.reply_status].label}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {/* Original comment */}
                <div className="bg-gray-50 rounded-lg p-3 mb-3">
                  <p className="text-sm">{comment.comment_text}</p>
                  {comment.created_at && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(comment.created_at).toLocaleDateString(
                        "fr-FR",
                        {
                          day: "numeric",
                          month: "long",
                          hour: "2-digit",
                          minute: "2-digit",
                        }
                      )}
                    </p>
                  )}
                </div>

                {/* Post context */}
                {comment.posts?.caption && (
                  <p className="text-xs text-muted-foreground mb-3 italic">
                    Post : &laquo; {comment.posts.caption.slice(0, 100)}
                    {comment.posts.caption.length > 100 ? "..." : ""} &raquo;
                  </p>
                )}

                {/* Feedback */}
                {feedback?.commentId === comment.id && (
                  <div
                    className={`text-xs p-2 rounded mb-3 ${
                      feedback.type === "success"
                        ? "bg-green-50 text-green-700 border border-green-200"
                        : "bg-red-50 text-red-700 border border-red-200"
                    }`}
                  >
                    {feedback.type === "error" && (
                      <AlertCircle className="h-3 w-3 inline mr-1" />
                    )}
                    {feedback.message}
                  </div>
                )}

                {/* AI reply + actions for pending comments */}
                {comment.reply_status === "pending_review" && (
                  <div className="space-y-3">
                    {comment.ai_reply && editingReply !== comment.id && (
                      <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                        <p className="text-xs font-medium text-blue-700 mb-1">
                          Suggestion IA :
                        </p>
                        <p className="text-sm">{comment.ai_reply}</p>
                      </div>
                    )}

                    {editingReply === comment.id && (
                      <Textarea
                        value={editedText}
                        onChange={(e) => setEditedText(e.target.value)}
                        placeholder={"R\u00e9digez votre r\u00e9ponse..."}
                        rows={3}
                        className="text-sm"
                      />
                    )}

                    <div className="flex gap-2 flex-wrap">
                      {/* Send AI reply as-is */}
                      {comment.ai_reply && editingReply !== comment.id && (
                        <Button
                          size="sm"
                          onClick={() =>
                            handleSendReply(comment, comment.ai_reply!)
                          }
                          disabled={sending === comment.id}
                        >
                          {sending === comment.id ? (
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4 mr-1" />
                          )}
                          Envoyer
                        </Button>
                      )}

                      {/* Edit reply */}
                      {editingReply !== comment.id ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingReply(comment.id);
                            setEditedText(comment.ai_reply || "");
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Modifier
                        </Button>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            onClick={() =>
                              handleSendReply(comment, editedText)
                            }
                            disabled={
                              sending === comment.id || !editedText.trim()
                            }
                          >
                            {sending === comment.id ? (
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            ) : (
                              <Send className="h-4 w-4 mr-1" />
                            )}
                            Envoyer
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingReply(null)}
                          >
                            <EyeOff className="h-4 w-4 mr-1" />
                            Annuler
                          </Button>
                        </>
                      )}

                      {/* Ignore */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleIgnore(comment.id)}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Ignorer
                      </Button>
                    </div>
                  </div>
                )}

                {/* Published reply */}
                {comment.reply_status === "published" && comment.ai_reply && (
                  <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                    <p className="text-xs font-medium text-green-700 mb-1">
                      <Check className="h-3 w-3 inline mr-1" />
                      R&eacute;ponse envoy&eacute;e :
                    </p>
                    <p className="text-sm">{comment.ai_reply}</p>
                    {comment.replied_at && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(comment.replied_at).toLocaleDateString(
                          "fr-FR",
                          {
                            day: "numeric",
                            month: "long",
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
