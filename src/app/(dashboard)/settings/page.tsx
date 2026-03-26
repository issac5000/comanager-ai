"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

type PostType = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
};

type EditorialMixItem = {
  id?: string;
  post_type_id: string;
  posts_per_week: number;
};

export default function SettingsPage() {
  const [orgId, setOrgId] = useState<string | null>(null);
  const [orgName, setOrgName] = useState("");
  const [brandVoice, setBrandVoice] = useState("");
  const [frequency, setFrequency] = useState("daily");
  const [preferredTime, setPreferredTime] = useState("10:00");
  const [autoPublish, setAutoPublish] = useState(false);
  const [postTypes, setPostTypes] = useState<PostType[]>([]);
  const [editorialMix, setEditorialMix] = useState<EditorialMixItem[]>([]);
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

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

      if (!membership) return;
      setOrgId(membership.org_id);

      // Load org
      const { data: org } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", membership.org_id!)
        .single();

      if (org) {
        setOrgName(org.name);
        setBrandVoice(org.brand_voice || "");
      }

      // Load publication settings
      const { data: pubSettings } = await supabase
        .from("publication_settings")
        .select("*")
        .eq("org_id", membership.org_id!)
        .single();

      if (pubSettings) {
        setFrequency(pubSettings.frequency || "daily");
        setPreferredTime(pubSettings.preferred_time || "10:00");
        setAutoPublish(pubSettings.auto_publish || false);
      }

      // Load post types
      const { data: types } = await supabase
        .from("post_types")
        .select("*")
        .order("name");
      if (types) setPostTypes(types);

      // Load editorial mix
      const { data: mix } = await supabase
        .from("editorial_mix")
        .select("*")
        .eq("org_id", membership.org_id!);
      if (mix) {
        setEditorialMix(
          mix.map((m) => ({
            id: m.id,
            post_type_id: m.post_type_id!,
            posts_per_week: m.posts_per_week || 0,
          }))
        );
      }
    }
    init();
  }, [supabase]);

  function getMixValue(postTypeId: string): number {
    const item = editorialMix.find((m) => m.post_type_id === postTypeId);
    return item?.posts_per_week || 0;
  }

  function setMixValue(postTypeId: string, value: number) {
    setEditorialMix((prev) => {
      const existing = prev.find((m) => m.post_type_id === postTypeId);
      if (existing) {
        return prev.map((m) =>
          m.post_type_id === postTypeId ? { ...m, posts_per_week: value } : m
        );
      }
      return [...prev, { post_type_id: postTypeId, posts_per_week: value }];
    });
  }

  async function handleSave() {
    if (!orgId) return;
    setSaving(true);

    // Update org
    await supabase
      .from("organizations")
      .update({ name: orgName, brand_voice: brandVoice })
      .eq("id", orgId);

    // Update publication settings
    await supabase
      .from("publication_settings")
      .upsert({
        org_id: orgId,
        frequency,
        preferred_time: preferredTime,
        auto_publish: autoPublish,
      }, { onConflict: "org_id" });

    // Update editorial mix
    for (const item of editorialMix) {
      if (item.posts_per_week > 0) {
        await supabase.from("editorial_mix").upsert(
          {
            org_id: orgId,
            post_type_id: item.post_type_id,
            posts_per_week: item.posts_per_week,
          },
          { onConflict: "org_id,post_type_id" }
        );
      }
    }

    setSaving(false);
    toast.success("Paramètres sauvegardés !");
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-8">Paramètres</h1>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Informations</CardTitle>
            <CardDescription>
              Nom et ton de votre entreprise
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="orgName">Nom de l&apos;entreprise</Label>
              <Input
                id="orgName"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="brandVoice">Ton éditorial</Label>
              <Textarea
                id="brandVoice"
                placeholder="Décrivez le ton souhaité pour vos publications (ex: professionnel, chaleureux, humoristique...)"
                value={brandVoice}
                onChange={(e) => setBrandVoice(e.target.value)}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Mix éditorial</CardTitle>
            <CardDescription>
              Combien de posts par semaine pour chaque type
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {postTypes.map((type) => (
              <div
                key={type.id}
                className="flex items-center justify-between py-2"
              >
                <div>
                  <p className="font-medium text-sm">{type.name}</p>
                  {type.description && (
                    <p className="text-xs text-muted-foreground">
                      {type.description}
                    </p>
                  )}
                </div>
                <Input
                  type="number"
                  min={0}
                  max={14}
                  className="w-20"
                  value={getMixValue(type.id)}
                  onChange={(e) =>
                    setMixValue(type.id, parseInt(e.target.value) || 0)
                  }
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Publication</CardTitle>
            <CardDescription>
              Fréquence et heure de publication
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Fréquence</Label>
              <Select value={frequency} onValueChange={(v) => v && setFrequency(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Quotidien</SelectItem>
                  <SelectItem value="3x_week">3x par semaine</SelectItem>
                  <SelectItem value="5x_week">5x par semaine</SelectItem>
                  <SelectItem value="weekly">Hebdomadaire</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">Heure préférée</Label>
              <Input
                id="time"
                type="time"
                value={preferredTime}
                onChange={(e) => setPreferredTime(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="autoPublish"
                checked={autoPublish}
                onCheckedChange={(checked) =>
                  setAutoPublish(checked as boolean)
                }
              />
              <Label htmlFor="autoPublish" className="text-sm font-normal">
                Publier automatiquement sans validation
              </Label>
            </div>
          </CardContent>
        </Card>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? "Enregistrement..." : "Enregistrer les paramètres"}
        </Button>
      </div>
    </div>
  );
}
