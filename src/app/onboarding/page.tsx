"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Industry = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
};

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [orgName, setOrgName] = useState("");
  const [selectedIndustry, setSelectedIndustry] = useState<string | null>(null);
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function loadIndustries() {
      const { data } = await supabase
        .from("industries")
        .select("id, name, slug, description")
        .order("name");
      if (data) setIndustries(data);
    }
    loadIndustries();
  }, [supabase]);

  async function handleSubmit() {
    setLoading(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Session expirée. Veuillez vous reconnecter.");
      setLoading(false);
      return;
    }

    // Generate ID client-side to avoid needing SELECT after INSERT
    const orgId = crypto.randomUUID();

    // Create organization
    const { error: orgError } = await supabase
      .from("organizations")
      .insert({
        id: orgId,
        name: orgName,
        industry_id: selectedIndustry,
      });

    if (orgError) {
      setError(orgError.message);
      setLoading(false);
      return;
    }

    // Add user as owner
    const { error: memberError } = await supabase
      .from("organization_members")
      .insert({
        org_id: orgId,
        user_id: user.id,
        role: "owner",
      });

    if (memberError) {
      setError(memberError.message);
      setLoading(false);
      return;
    }

    // Create default publication settings
    await supabase.from("publication_settings").insert({
      org_id: orgId,
    });

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">
            Bienvenue sur CoManager AI
          </CardTitle>
          <CardDescription>
            {step === 1
              ? "Comment s'appelle votre entreprise ?"
              : "Quel est votre secteur d'activité ?"}
          </CardDescription>
          <div className="flex justify-center gap-2 pt-2">
            <div
              className={`h-2 w-16 rounded-full ${step >= 1 ? "bg-primary" : "bg-gray-200"}`}
            />
            <div
              className={`h-2 w-16 rounded-full ${step >= 2 ? "bg-primary" : "bg-gray-200"}`}
            />
          </div>
        </CardHeader>
        <CardContent>
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="orgName">Nom de l&apos;entreprise</Label>
                <Input
                  id="orgName"
                  placeholder="Ex: Boulangerie Martin"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                />
              </div>
              <Button
                className="w-full"
                disabled={!orgName.trim()}
                onClick={() => setStep(2)}
              >
                Continuer
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {industries.map((industry) => (
                  <button
                    key={industry.id}
                    onClick={() => setSelectedIndustry(industry.id)}
                    className={`rounded-lg border-2 p-3 text-left transition-colors ${
                      selectedIndustry === industry.id
                        ? "border-primary bg-primary/5"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <p className="font-medium text-sm">{industry.name}</p>
                    {industry.description && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {industry.description}
                      </p>
                    )}
                  </button>
                ))}
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setStep(1)}
                >
                  Retour
                </Button>
                <Button
                  className="flex-1"
                  disabled={!selectedIndustry || loading}
                  onClick={handleSubmit}
                >
                  {loading ? "Création..." : "Créer mon espace"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
