"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Globe, Link2, Unlink, AlertTriangle } from "lucide-react";

type ConnectedAccount = {
  id: string;
  platform: string;
  platform_username: string | null;
  page_id: string | null;
  page_name: string | null;
  ig_user_id: string | null;
  ig_username: string | null;
  token_expires_at: string | null;
  created_at: string | null;
};

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const supabase = createClient();

  const loadAccounts = useCallback(async () => {
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
      .select(
        "id, platform, platform_username, page_id, page_name, ig_user_id, ig_username, token_expires_at, created_at"
      )
      .eq("org_id", membership.org_id);

    if (data) setAccounts(data);
  }, [supabase]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  async function handleDisconnect(accountId: string) {
    setDisconnecting(accountId);
    try {
      const res = await fetch("/api/meta/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account_id: accountId }),
      });
      if (res.ok) {
        setAccounts((prev) => prev.filter((a) => a.id !== accountId));
      }
    } finally {
      setDisconnecting(null);
    }
  }

  const fbAccounts = accounts.filter((a) => a.platform === "facebook");
  const igAccounts = accounts.filter((a) => a.platform === "instagram");
  const hasAnyAccount = accounts.length > 0;

  // Check if any FB account has no linked Instagram
  const fbWithoutIg = fbAccounts.filter((fb) => !fb.ig_user_id);

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-2">Comptes connect&eacute;s</h1>
      <p className="text-muted-foreground mb-8">
        Connectez vos comptes Facebook et Instagram pour publier automatiquement.
      </p>

      {/* Connect button */}
      <div className="mb-6">
        <a
          href="/api/meta/connect"
          className="inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground px-4 h-9 text-sm font-medium hover:bg-primary/80 transition-colors"
        >
          <Globe className="h-4 w-4 mr-2" />
          Connecter Facebook &amp; Instagram
        </a>
      </div>

      {/* Success / error messages from URL params */}
      <URLMessages />

      <div className="space-y-4">
        {/* Facebook accounts */}
        {fbAccounts.map((account) => (
          <Card key={account.id}>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Globe className="h-5 w-5 text-blue-600" />
                <div>
                  <CardTitle className="text-base">
                    {account.page_name || account.platform_username || "Page Facebook"}
                  </CardTitle>
                  <CardDescription>Page Facebook</CardDescription>
                </div>
              </div>
              <Badge>Connect&eacute;</Badge>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-muted-foreground">
                Page ID : {account.page_id}
                {account.ig_user_id && (
                  <span className="ml-3">
                    &middot; Instagram li&eacute; : @{account.ig_username}
                  </span>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDisconnect(account.id)}
                disabled={disconnecting === account.id}
              >
                <Unlink className="h-4 w-4 mr-1" />
                {disconnecting === account.id ? "..." : "D\u00e9connecter"}
              </Button>
            </CardContent>
          </Card>
        ))}

        {/* Instagram accounts */}
        {igAccounts.map((account) => (
          <Card key={account.id}>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Globe className="h-5 w-5 text-pink-600" />
                <div>
                  <CardTitle className="text-base">
                    @{account.ig_username || account.platform_username}
                  </CardTitle>
                  <CardDescription>
                    Compte Instagram Business{" "}
                    {account.page_name && `(via ${account.page_name})`}
                  </CardDescription>
                </div>
              </div>
              <Badge>Connect&eacute;</Badge>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Publication automatique activ&eacute;e
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDisconnect(account.id)}
                disabled={disconnecting === account.id}
              >
                <Unlink className="h-4 w-4 mr-1" />
                {disconnecting === account.id ? "..." : "D\u00e9connecter"}
              </Button>
            </CardContent>
          </Card>
        ))}

        {/* Warning for FB pages without Instagram */}
        {fbWithoutIg.length > 0 && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="flex items-start gap-3 p-4">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-amber-800 mb-1">
                  Compte Instagram non d&eacute;tect&eacute;
                </p>
                <p className="text-amber-700">
                  Votre Page Facebook{" "}
                  <strong>{fbWithoutIg.map((f) => f.page_name).join(", ")}</strong>{" "}
                  n&apos;a pas de compte Instagram Business li&eacute;. Vous pouvez quand
                  m&ecirc;me publier sur Facebook, et utiliser les boutons copier/t&eacute;l&eacute;charger
                  pour publier manuellement sur Instagram.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty state */}
        {!hasAnyAccount && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center p-8 text-center">
              <Link2 className="h-8 w-8 text-muted-foreground mb-3" />
              <p className="text-sm font-medium mb-1">Aucun compte connect&eacute;</p>
              <p className="text-sm text-muted-foreground">
                Cliquez sur le bouton ci-dessus pour connecter vos comptes Facebook et
                Instagram via Meta.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function URLMessages() {
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get("success");
    const error = params.get("error");

    if (success === "meta_connected") {
      const igDebug = params.get("ig_debug");
      setMessage({
        type: "success",
        text: `Comptes Facebook & Instagram connect\u00e9s avec succ\u00e8s !${igDebug ? ` [IG debug: ${igDebug}]` : ""}`,
      });
    } else if (error === "meta_auth_denied") {
      setMessage({
        type: "error",
        text: "Vous avez refus\u00e9 les permissions Meta. Veuillez r\u00e9essayer.",
      });
    } else if (error === "no_pages") {
      const detail = params.get("detail");
      setMessage({
        type: "error",
        text: `Aucune Page Facebook trouv\u00e9e. ${detail ? `R\u00e9ponse Meta : ${detail}` : "Vous devez g\u00e9rer au moins une Page."}`,
      });
    } else if (error === "token_exchange_failed") {
      setMessage({
        type: "error",
        text: "\u00c9change du code d'autorisation \u00e9chou\u00e9. Le code a peut-\u00eatre expir\u00e9. Veuillez r\u00e9essayer.",
      });
    } else if (error === "long_token_failed") {
      setMessage({
        type: "error",
        text: "\u00c9change pour un token longue dur\u00e9e \u00e9chou\u00e9. V\u00e9rifiez la configuration de l'app Meta.",
      });
    } else if (error === "get_pages_failed") {
      setMessage({
        type: "error",
        text: "Impossible de r\u00e9cup\u00e9rer vos Pages Facebook. V\u00e9rifiez les permissions accord\u00e9es.",
      });
    } else if (error === "invalid_state") {
      setMessage({
        type: "error",
        text: "V\u00e9rification de s\u00e9curit\u00e9 \u00e9chou\u00e9e (CSRF). Veuillez r\u00e9essayer.",
      });
    } else if (error) {
      const detail = params.get("detail");
      setMessage({
        type: "error",
        text: `Erreur connexion Meta : ${error}${detail ? ` — ${detail}` : ""}`,
      });
    }

    // Clean URL
    if (success || error) {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  if (!message) return null;

  return (
    <div
      className={`mb-6 p-4 rounded-lg text-sm ${
        message.type === "success"
          ? "bg-green-50 text-green-800 border border-green-200"
          : "bg-red-50 text-red-800 border border-red-200"
      }`}
    >
      {message.text}
    </div>
  );
}
