import { headers } from "next/headers";

// robots.txt selon l'hôte : le site public est indexable (sauf les fiches de
// collaborateurs, en noindex, et les espaces privés) ; admin, webmail, mail et
// les aperçus ne le sont jamais.
export async function GET() {
  const host = ((await headers()).get("host") ?? "").split(":")[0].toLowerCase();
  const public_ = host === "www.dataparl.fr" || host === "api.dataparl.fr";

  // Sections exclues de l'indexation (moteurs classiques ET IA génératives) :
  // espaces privés, back-office et pages hors périmètre pour le moment (jobs).
  const exclus = [
    "Disallow: /api/",
    "Disallow: /admin",
    "Disallow: /webmail",
    "Disallow: /mon-compte",
    "Disallow: /preferences",
    "Disallow: /desinscription",
    "Disallow: /connexion",
    "Disallow: /l/",
    "Disallow: /informations-legales",
    "Disallow: /jobs",
    "Allow: /media/",
  ];

  // Crawlers d'IA génératives (GEO) : contenus publics explicitement
  // autorisés pour la recherche conversationnelle et le grounding, avec les
  // mêmes exclusions que les moteurs classiques (un groupe dédié hérite sinon
  // de tout « Allow: / », y compris les espaces privés).
  const botsIA = [
    // OpenAI : entraînement, recherche ChatGPT, fetch utilisateur
    "GPTBot", "OAI-SearchBot", "ChatGPT-User",
    // Perplexity : index et fetch utilisateur
    "PerplexityBot", "Perplexity-User",
    // Anthropic : entraînement, recherche, fetch utilisateur, ancien token
    "ClaudeBot", "Claude-SearchBot", "Claude-User", "Claude-Web",
    // Google (Gemini grounding + entraînement), Apple, Common Crawl
    "Google-Extended", "Applebot-Extended", "CCBot",
    // xAI (Grok) : tokens rapportés, non officiellement documentés
    "GrokBot", "xAI-SearchBot",
    // Meta AI : agent de récupération et fetch utilisateur
    "Meta-ExternalAgent", "Meta-ExternalFetcher",
    // Mistral (Vibe / Le Chat) : fetch utilisateur
    "MistralAI-User",
    // Duck.ai (DuckAssist)
    "DuckAssistBot",
  ].map((b) => ["User-agent: " + b, "Allow: /", ...exclus, ""]).flat();

  const corps = public_
    ? [
        ...botsIA,
        "User-agent: *",
        "Allow: /",
        ...exclus,
        "",
        `Sitemap: https://${host}/sitemap.xml`,
      ].join("\n")
    : "User-agent: *\nDisallow: /";
  return new Response(corps + "\n", { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
