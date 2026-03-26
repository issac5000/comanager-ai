"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Upload, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

type MediaItem = {
  id: string;
  storage_path: string;
  filename: string | null;
  tags: string[] | null;
  used_count: number | null;
  created_at: string | null;
};

export default function MediaPage() {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [orgId, setOrgId] = useState<string | null>(null);
  const supabase = createClient();

  const loadMedia = useCallback(async () => {
    if (!orgId) return;
    const { data } = await supabase
      .from("media")
      .select("*")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });
    if (data) setMedia(data);
  }, [orgId, supabase]);

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

      if (membership) {
        setOrgId(membership.org_id);
      }
    }
    init();
  }, [supabase]);

  useEffect(() => {
    loadMedia();
  }, [loadMedia]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || !orgId) return;

    setUploading(true);

    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop();
      const path = `${orgId}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("media")
        .upload(path, file);

      if (uploadError) {
        toast.error(`Erreur upload: ${file.name}`);
        continue;
      }

      await supabase.from("media").insert({
        org_id: orgId,
        storage_path: path,
        filename: file.name,
      });
    }

    setUploading(false);
    loadMedia();
    toast.success("Photos ajoutées !");
    // Reset the input
    e.target.value = "";
  }

  async function handleDelete(item: MediaItem) {
    await supabase.storage.from("media").remove([item.storage_path]);
    await supabase.from("media").delete().eq("id", item.id);
    setMedia((prev) => prev.filter((m) => m.id !== item.id));
    toast.success("Photo supprimée");
  }

  function getPublicUrl(path: string) {
    const { data } = supabase.storage.from("media").getPublicUrl(path);
    return data.publicUrl;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Médiathèque</h1>
          <p className="text-muted-foreground">
            {media.length} photo{media.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div>
          <Input
            type="file"
            accept="image/*"
            multiple
            id="upload"
            className="hidden"
            onChange={handleUpload}
          />
          <Button
            disabled={uploading}
            onClick={() => document.getElementById("upload")?.click()}
          >
            {uploading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            {uploading ? "Upload en cours..." : "Ajouter des photos"}
          </Button>
        </div>
      </div>

      {media.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12 text-center">
          <Upload className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="font-semibold text-lg mb-2">
            Aucune photo pour l&apos;instant
          </h3>
          <p className="text-muted-foreground mb-4">
            Uploadez vos premières photos pour que l&apos;IA puisse créer vos posts.
          </p>
          <Button onClick={() => document.getElementById("upload")?.click()}>
            <Upload className="mr-2 h-4 w-4" />
            Ajouter des photos
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {media.map((item) => (
            <div key={item.id} className="group relative">
              <div className="aspect-square overflow-hidden rounded-lg border bg-gray-100">
                <img
                  src={getPublicUrl(item.storage_path)}
                  alt={item.filename || "Photo"}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="absolute inset-0 flex items-start justify-end p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  size="icon"
                  variant="destructive"
                  className="h-8 w-8"
                  onClick={() => handleDelete(item)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              {item.filename && (
                <p className="mt-1 text-xs text-muted-foreground truncate">
                  {item.filename}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
