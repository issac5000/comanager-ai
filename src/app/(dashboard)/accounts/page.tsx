"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link2 } from "lucide-react";

type ConnectedAccount = {
  id: string;
  platform: string;
  platform_username: string | null;
  created_at: string | null;
};

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
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

      if (!membership?.org_id) return;

      const { data } = await supabase
        .from("connected_accounts")
        .select("id, platform, platform_username, created_at")
        .eq("org_id", membership.org_id);

      if (data) setAccounts(data);
    }
    init();
  }, [supabase]);

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-2">Comptes connectés</h1>
      <p className="text-muted-foreground mb-8">
        Connectez vos comptes Instagram et Facebook pour publier automatiquement.
      </p>

      <div className="space-y-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Instagram</CardTitle>
              <CardDescription>Publication de posts et stories</CardDescription>
            </div>
            {accounts.find((a) => a.platform === "instagram") ? (
              <Badge>Connecté</Badge>
            ) : (
              <Badge variant="outline">Non connecté</Badge>
            )}
          </CardHeader>
          <CardContent>
            {accounts.find((a) => a.platform === "instagram") ? (
              <p className="text-sm text-muted-foreground">
                @{accounts.find((a) => a.platform === "instagram")?.platform_username}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                La connexion Instagram via Meta Graph API sera disponible prochainement.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Facebook</CardTitle>
              <CardDescription>Publication sur votre page</CardDescription>
            </div>
            {accounts.find((a) => a.platform === "facebook") ? (
              <Badge>Connecté</Badge>
            ) : (
              <Badge variant="outline">Non connecté</Badge>
            )}
          </CardHeader>
          <CardContent>
            {accounts.find((a) => a.platform === "facebook") ? (
              <p className="text-sm text-muted-foreground">
                {accounts.find((a) => a.platform === "facebook")?.platform_username}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                La connexion Facebook via Meta Graph API sera disponible prochainement.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center p-8 text-center">
            <Link2 className="h-8 w-8 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              L&apos;intégration Meta Graph API pour Instagram et Facebook sera
              activée dans la prochaine phase de développement.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
