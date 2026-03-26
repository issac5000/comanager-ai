"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";

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

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  generating: { label: "Génération...", variant: "secondary" },
  pending_review: { label: "À valider", variant: "default" },
  approved: { label: "Approuvé", variant: "outline" },
  published: { label: "Publié", variant: "default" },
  rejected: { label: "Rejeté", variant: "destructive" },
  failed: { label: "Échoué", variant: "destructive" },
};

const FILTERS = [
  { value: "all", label: "Tous" },
  { value: "pending_review", label: "À valider" },
  { value: "approved", label: "Approuvés" },
  { value: "published", label: "Publiés" },
  { value: "rejected", label: "Rejetés" },
];

export default function PostsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [filter, setFilter] = useState("all");
  const [orgId, setOrgId] = useState<string | null>(null);
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

      if (membership) setOrgId(membership.org_id);
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

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Publications</h1>
        <p className="text-muted-foreground">
          Gérez et validez vos posts générés par l&apos;IA
        </p>
      </div>

      <div className="flex gap-2 mb-6">
        {FILTERS.map((f) => (
          <Button
            key={f.value}
            variant={filter === f.value ? "default" : "outline"}
            size="sm"
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
              ? "Les posts générés par l'IA apparaîtront ici."
              : "Aucun post avec ce statut."}
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <Card key={post.id}>
              {post.generated_image_url && (
                <div className="aspect-square overflow-hidden rounded-t-lg">
                  <img
                    src={post.generated_image_url}
                    alt="Post"
                    className="h-full w-full object-cover"
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
                  <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
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
                {post.status === "pending_review" && (
                  <div className="flex gap-2">
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
                {post.scheduled_for && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Planifié : {new Date(post.scheduled_for).toLocaleDateString("fr-FR")}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
