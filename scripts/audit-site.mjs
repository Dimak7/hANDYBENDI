import fs from "node:fs/promises";
const origin = "https://handybandi.com";
const routes = [
  "/",
  "/our-pricing/",
  "/services/",
  "/services/commercial/",
  "/services/commercial/property-management-maintenance/",
  "/about/",
  "/our-projects/",
  "/blog/",
  "/careers/",
  "/contact/",
  "/services/furniture-assembly-in-chicago/",
  "/services/tv-mounting-in-chicago/",
  "/services/handyman-in-lakeview-chicago/",
  "/privacy-policy/",
  "/terms-and-conditions/",
];
await fs.mkdir("artifacts/site-audit", { recursive: true });
await fs.mkdir("docs", { recursive: true });
const inventory = [];
for (const route of routes) {
  const response = await fetch(origin + route);
  const html = await response.text();
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  const canonical = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)/i)?.[1];
  const description = html.match(
    /<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)/i,
  )?.[1];
  const links = [
    ...new Set(
      [...html.matchAll(/href=["'](https:\/\/handybandi\.com\/[^"'#]*)/g)].map((m) => m[1]),
    ),
  ];
  inventory.push({
    route,
    url: response.url,
    status: response.status,
    title,
    canonical,
    description,
    links,
  });
  await fs.writeFile(`artifacts/site-audit/${route.replaceAll("/", "_") || "home"}.html`, html);
  if (route === "/") {
    const styles = [...html.matchAll(/<link[^>]+href=["']([^"']+\.css[^"']*)/g)]
      .map((m) => m[1])
      .slice(0, 20);
    console.log(
      JSON.stringify({
        styles,
        links: links.filter((x) => /property|contact|furniture|mounting|lakeview/.test(x)),
      }),
    );
    if (styles[0]) {
      const css = await fetch(styles[0]).then((r) => r.text());
      await fs.writeFile("artifacts/site-audit/live.css", css);
      console.log(
        JSON.stringify({
          colors: [...new Set(css.match(/#[0-9a-fA-F]{6}\b/g))].slice(0, 60),
          fonts: [...new Set([...css.matchAll(/font-family:([^;}]+)/g)].map((m) => m[1]))].slice(
            0,
            30,
          ),
        }),
      );
    }
  }
}
await fs.writeFile("docs/seo-inventory.json", JSON.stringify(inventory, null, 2));
console.log(
  `Read-only audit saved for ${inventory.length} URLs; raw HTML is in ignored artifacts/site-audit.`,
);
