import fs from "node:fs/promises";
await fs.mkdir("public/fonts", { recursive: true });
for (const [url, path] of [
  [
    "https://handybandi.com/wp-content/uploads/2025/05/qtq_63-1-300x213.png",
    "public/handybandi-logo.png",
  ],
  [
    "https://handybandi.com/wp-content/themes/fikco-child/assets/fonts/inter/inter-latin.woff2",
    "public/fonts/inter-latin.woff2",
  ],
  [
    "https://handybandi.com/wp-content/themes/fikco-child/assets/fonts/manrope/manrope-latin.woff2",
    "public/fonts/manrope-latin.woff2",
  ],
]) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Asset unavailable: ${r.status}`);
  await fs.writeFile(path, Buffer.from(await r.arrayBuffer()));
  console.log(`Saved ${path}`);
}
