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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { X } from "lucide-react";

type PostType = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
};

type Industry = {
  id: string;
  name: string;
};

type EditorialMixItem = {
  id?: string;
  post_type_id: string;
  posts_per_week: number;
};

export default function SettingsPage() {
  const [orgId, setOrgId] = useState<string | null>(null);
  const [orgName, setOrgName] = useState("");
  const [description, setDescription] = useState("");
  const [brandVoice, setBrandVoice] = useState("");
  const [industryId, setIndustryId] = useState<string | null>(null);
  const [website, setWebsite] = useState("");
  const [location, setLocation] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [services, setServices] = useState<string[]>([]);
  const [serviceInput, setServiceInput] = useState("");
  const [colorPalette, setColorPalette] = useState<string[]>([]);
  const [colorInput, setColorInput] = useState("#000000");
  const [topicsInclude, setTopicsInclude] = useState<string[]>([]);
  const [topicIncludeInput, setTopicIncludeInput] = useState("");
  const [topicsExclude, setTopicsExclude] = useState<string[]>([]);
  const [topicExcludeInput, setTopicExcludeInput] = useState("");
  const [industries, setIndustries] = useState<Industry[]>([]);
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

      // Load all data in parallel
      const [orgResult, pubResult, typesResult, industriesResult, mixResult] =
        await Promise.all([
          supabase
            .from("organizations")
            .select("*")
            .eq("id", membership.org_id!)
            .single(),
          supabase
            .from("publication_settings")
            .select("*")
            .eq("org_id", membership.org_id!)
            .single(),
          supabase.from("post_types").select("*").order("name"),
          supabase.from("industries").select("id, name").order("name"),
          supabase
            .from("editorial_mix")
            .select("*")
            .eq("org_id", membership.org_id!),
        ]);

      if (orgResult.data) {
        const org = orgResult.data;
        setOrgName(org.name);
        setDescription(org.description || "");
        setBrandVoice(org.brand_voice || "");
        setIndustryId(org.industry_id || null);
        setWebsite(org.website || "");
        setLocation(org.location || "");
        setTargetAudience(org.target_audience || "");
        setServices(org.services || []);
        setColorPalette(org.color_palette || []);
        setTopicsInclude(org.topics_include || []);
        setTopicsExclude(org.topics_exclude || []);
      }

      if (pubResult.data) {
        setFrequency(pubResult.data.frequency || "daily");
        setPreferredTime(pubResult.data.preferred_time || "10:00");
        setAutoPublish(pubResult.data.auto_publish || false);
      }

      if (typesResult.data) setPostTypes(typesResult.data);
      if (industriesResult.data) setIndustries(industriesResult.data);
      if (mixResult.data) {
        setEditorialMix(
          mixResult.data.map((m) => ({
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
    return editorialMix.find((m) => m.post_type_id === postTypeId)?.posts_per_week || 0;
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

  function addTag(
    value: string,
    list: string[],
    setList: (v: string[]) => void,
    setInput: (v: string) => void
  ) {
    const trimmed = value.trim();
    if (trimmed && !list.includes(trimmed)) {
      setList([...list, trimmed]);
    }
    setInput("");
  }

  async function handleSave() {
    if (!orgId) return;
    setSaving(true);

    await supabase
      .from("organizations")
      .update({
        name: orgName,
        description: description || null,
        brand_voice: brandVoice || null,
        industry_id: industryId || null,
        website: website || null,
        location: location || null,
        target_audience: targetAudience || null,
        services,
        color_palette: colorPalette,
        topics_include: topicsInclude,
        topics_exclude: topicsExclude,
      })
      .eq("id", orgId);

    await supabase.from("publication_settings").upsert(
      {
        org_id: orgId,
        frequency,
        preferred_time: preferredTime,
        auto_publish: autoPublish,
      },
      { onConflict: "org_id" }
    );

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
    toast.success("Param\u00e8tres sauvegard\u00e9s !");
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-2">Param&egrave;tres</h1>
      <p className="text-muted-foreground mb-8">
        Plus vous d&eacute;crivez votre entreprise, plus l&apos;IA g&eacute;n&egrave;re du contenu pertinent.
      </p>

      <div className="space-y-6">
        {/* Business profile */}
        <Card>
          <CardHeader>
            <CardTitle>Profil de l&apos;entreprise</CardTitle>
            <CardDescription>
              Ces informations sont utilis&eacute;es par l&apos;IA pour g&eacute;n&eacute;rer du contenu sur mesure
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
              <Label htmlFor="industry">Secteur d&apos;activit&eacute;</Label>
              {industries.length > 0 ? (
                <Select
                  value={industryId || undefined}
                  onValueChange={(v) => setIndustryId(v || null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un secteur" />
                  </SelectTrigger>
                  <SelectContent>
                    {industries.map((ind) => (
                      <SelectItem key={ind.id} value={ind.id}>
                        {ind.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input disabled placeholder="Chargement..." />
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">
                Description de l&apos;entreprise
              </Label>
              <Textarea
                id="description"
                placeholder={"D\u00e9crivez votre activit\u00e9, vos produits/services, ce qui vous diff\u00e9rencie... (ex: Boulangerie artisanale \u00e0 Lyon, sp\u00e9cialis\u00e9e dans le pain au levain et les p\u00e2tisseries maison.)"}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="website">Site web</Label>
                <Input
                  id="website"
                  placeholder="https://..."
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Localisation</Label>
                <Input
                  id="location"
                  placeholder="Lyon, France"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="targetAudience">Audience cible</Label>
              <Textarea
                id="targetAudience"
                placeholder={"D\u00e9crivez vos clients id\u00e9aux (ex: Jeunes actifs 25-40 ans, soucieux de leur alimentation, habitant en centre-ville)"}
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                rows={2}
              />
            </div>

            {/* Services/products tags */}
            <div className="space-y-2">
              <Label>Produits / Services</Label>
              <div className="flex gap-2">
                <Input
                  placeholder={"Ajoutez un produit ou service puis Entr\u00e9e"}
                  value={serviceInput}
                  onChange={(e) => setServiceInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTag(serviceInput, services, setServices, setServiceInput);
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    addTag(serviceInput, services, setServices, setServiceInput)
                  }
                >
                  Ajouter
                </Button>
              </div>
              {services.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {services.map((s) => (
                    <Badge key={s} variant="secondary" className="gap-1">
                      {s}
                      <button
                        onClick={() =>
                          setServices(services.filter((x) => x !== s))
                        }
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Brand identity */}
        <Card>
          <CardHeader>
            <CardTitle>Identit&eacute; de marque</CardTitle>
            <CardDescription>
              D&eacute;finissez le ton et les couleurs de votre marque
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="brandVoice">Ton &eacute;ditorial</Label>
              <Textarea
                id="brandVoice"
                placeholder={"D\u00e9crivez le ton souhait\u00e9 (ex: Chaleureux et authentique, on tutoie nos clients. Ton passionn\u00e9 quand on parle de nos produits.)"}
                value={brandVoice}
                onChange={(e) => setBrandVoice(e.target.value)}
                rows={3}
              />
            </div>

            {/* Color palette */}
            <div className="space-y-2">
              <Label>Palette de couleurs</Label>
              <div className="flex gap-2 items-center">
                <Input
                  type="color"
                  className="w-12 h-9 p-1 cursor-pointer"
                  value={colorInput}
                  onChange={(e) => setColorInput(e.target.value)}
                />
                <Input
                  className="w-28"
                  value={colorInput}
                  onChange={(e) => setColorInput(e.target.value)}
                  placeholder="#000000"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (
                      colorInput &&
                      !colorPalette.includes(colorInput)
                    ) {
                      setColorPalette([...colorPalette, colorInput]);
                    }
                  }}
                >
                  Ajouter
                </Button>
              </div>
              {colorPalette.length > 0 && (
                <div className="flex gap-2 mt-1">
                  {colorPalette.map((c) => (
                    <button
                      key={c}
                      className="relative w-8 h-8 rounded-md border group"
                      style={{ backgroundColor: c }}
                      title={`${c} — cliquer pour supprimer`}
                      onClick={() =>
                        setColorPalette(colorPalette.filter((x) => x !== c))
                      }
                    >
                      <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 rounded-md">
                        <X className="h-3 w-3 text-white" />
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Topics include */}
            <div className="space-y-2">
              <Label>Sujets &agrave; aborder</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Ex: pain au levain, recettes, coulisses..."
                  value={topicIncludeInput}
                  onChange={(e) => setTopicIncludeInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTag(
                        topicIncludeInput,
                        topicsInclude,
                        setTopicsInclude,
                        setTopicIncludeInput
                      );
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    addTag(
                      topicIncludeInput,
                      topicsInclude,
                      setTopicsInclude,
                      setTopicIncludeInput
                    )
                  }
                >
                  Ajouter
                </Button>
              </div>
              {topicsInclude.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {topicsInclude.map((t) => (
                    <Badge key={t} variant="secondary" className="gap-1">
                      {t}
                      <button
                        onClick={() =>
                          setTopicsInclude(topicsInclude.filter((x) => x !== t))
                        }
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Topics exclude */}
            <div className="space-y-2">
              <Label>Sujets &agrave; &eacute;viter</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Ex: politique, religion..."
                  value={topicExcludeInput}
                  onChange={(e) => setTopicExcludeInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTag(
                        topicExcludeInput,
                        topicsExclude,
                        setTopicsExclude,
                        setTopicExcludeInput
                      );
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    addTag(
                      topicExcludeInput,
                      topicsExclude,
                      setTopicsExclude,
                      setTopicExcludeInput
                    )
                  }
                >
                  Ajouter
                </Button>
              </div>
              {topicsExclude.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {topicsExclude.map((t) => (
                    <Badge key={t} variant="destructive" className="gap-1">
                      {t}
                      <button
                        onClick={() =>
                          setTopicsExclude(topicsExclude.filter((x) => x !== t))
                        }
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Editorial mix */}
        <Card>
          <CardHeader>
            <CardTitle>Mix &eacute;ditorial</CardTitle>
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

        {/* Publication settings */}
        <Card>
          <CardHeader>
            <CardTitle>Publication</CardTitle>
            <CardDescription>
              Fr&eacute;quence et heure de publication
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Fr&eacute;quence</Label>
              <Select
                value={frequency}
                onValueChange={(v) => v && setFrequency(v)}
              >
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
              <Label htmlFor="time">Heure pr&eacute;f&eacute;r&eacute;e</Label>
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
          {saving ? "Enregistrement..." : "Enregistrer les param\u00e8tres"}
        </Button>
      </div>
    </div>
  );
}
