import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <h1 className="text-xl font-bold">CoManager AI</h1>
          <div className="flex gap-3">
            <Link href="/login">
              <Button variant="ghost">Se connecter</Button>
            </Link>
            <Link href="/register">
              <Button>
                <span className="sm:hidden">Commencer</span>
                <span className="hidden sm:inline">Commencer gratuitement</span>
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="container mx-auto px-4 py-24 text-center">
          <h2 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            Vos réseaux sociaux,
            <br />
            <span className="text-primary">pilotés par l&apos;IA</span>
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Uploadez vos photos, configurez vos préférences éditoriales, et
            laissez l&apos;IA générer et publier vos posts Instagram &amp; Facebook.
            Validez en un clic.
          </p>
          <div className="mt-10 flex justify-center gap-4">
            <Link href="/register">
              <Button size="lg" className="text-base px-8">
                Démarrer maintenant
              </Button>
            </Link>
          </div>
        </section>

        <section className="border-t bg-gray-50 py-20">
          <div className="container mx-auto px-4">
            <h3 className="text-center text-2xl font-bold mb-12">
              Comment ça marche
            </h3>
            <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              {[
                {
                  step: "1",
                  title: "Uploadez vos photos",
                  desc: "Ajoutez vos photos de produits, équipe, locaux... dans votre médiathèque.",
                },
                {
                  step: "2",
                  title: "Configurez vos préférences",
                  desc: "Choisissez votre secteur, ton éditorial, fréquence de publication et types de posts.",
                },
                {
                  step: "3",
                  title: "Validez et publiez",
                  desc: "L'IA génère vos posts. Approuvez-les en un clic et ils sont publiés automatiquement.",
                },
              ].map((item) => (
                <div key={item.step} className="text-center">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white font-bold text-lg">
                    {item.step}
                  </div>
                  <h4 className="font-semibold text-lg mb-2">{item.title}</h4>
                  <p className="text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t py-20">
          <div className="container mx-auto px-4">
            <h3 className="text-center text-2xl font-bold mb-12">
              Pour tous les secteurs
            </h3>
            <div className="flex flex-wrap justify-center gap-3 max-w-3xl mx-auto">
              {[
                "Restaurant",
                "Salon de coiffure",
                "Immobilier",
                "Salle de sport",
                "E-commerce",
                "Artisan",
                "Hôtellerie",
                "Consulting",
                "Santé",
                "Commerce local",
              ].map((industry) => (
                <span
                  key={industry}
                  className="rounded-full border px-4 py-2 text-sm font-medium"
                >
                  {industry}
                </span>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} CoManager AI. Tous droits réservés.
        </div>
      </footer>
    </div>
  );
}
