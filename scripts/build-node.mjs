// Compile les scripts Node autonomes (worker, migrations, seed) en un seul fichier ESM.
// Le marqueur `server-only` est neutralisé : il n'a de sens que dans le bundle Next.js.
import { build } from "esbuild";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const entries = { worker: "worker/index.ts", migrate: "scripts/migrate.ts", seed: "scripts/seed.ts" };

await build({
  entryPoints: Object.fromEntries(Object.entries(entries).map(([name, file]) => [name, path.join(root, file)])),
  outdir: path.join(root, "dist"),
  outExtension: { ".js": ".mjs" },
  bundle: true,
  platform: "node",
  target: "node22",
  format: "esm",
  sourcemap: true,
  alias: { "@": root, "server-only": path.join(root, "scripts/empty.mjs") },
  // Modules natifs ou volumineux chargés depuis node_modules à l'exécution.
  external: ["sharp", "pg-native"],
  banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" },
  logLevel: "info",
});
