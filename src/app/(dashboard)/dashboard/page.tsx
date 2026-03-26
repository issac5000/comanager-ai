import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Image, Clock, CheckCircle } from "lucide-react";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Get user's org
  const { data: membership } = await supabase
    .from("organization_members")
    .select("org_id, organizations(name, industry_id)")
    .eq("user_id", user!.id)
    .limit(1)
    .single();

  const orgId = membership?.org_id;

  // Fetch stats
  const [postsResult, mediaResult, pendingResult, publishedResult] =
    await Promise.all([
      supabase
        .from("posts")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId!),
      supabase
        .from("media")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId!),
      supabase
        .from("posts")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId!)
        .eq("status", "pending_review"),
      supabase
        .from("posts")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId!)
        .eq("status", "published"),
    ]);

  const stats = [
    {
      label: "Total posts",
      value: postsResult.count ?? 0,
      icon: FileText,
    },
    {
      label: "Photos",
      value: mediaResult.count ?? 0,
      icon: Image,
    },
    {
      label: "En attente",
      value: pendingResult.count ?? 0,
      icon: Clock,
    },
    {
      label: "Publiés",
      value: publishedResult.count ?? 0,
      icon: CheckCircle,
    },
  ];

  const orgName =
    membership?.organizations &&
    !Array.isArray(membership.organizations)
      ? membership.organizations.name
      : "Mon entreprise";

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Tableau de bord</h1>
      <p className="text-muted-foreground mb-8">{orgName}</p>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Pour commencer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>1. Ajoutez des photos dans votre médiathèque</p>
          <p>2. Configurez vos préférences éditoriales dans les paramètres</p>
          <p>3. L&apos;IA générera automatiquement vos posts à valider</p>
        </CardContent>
      </Card>
    </div>
  );
}
