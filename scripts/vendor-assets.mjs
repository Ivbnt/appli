// Copie le worker MapLibre (et son module partagé) dans public/ : le bundler ne
// l'inclut pas automatiquement. Exécuté avant `dev` et `build`.
import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";

const source = path.resolve("node_modules/maplibre-gl/dist");
const target = path.resolve("public/vendor/maplibre");
await mkdir(target, { recursive: true });
for (const file of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) {
  await copyFile(path.join(source, file), path.join(target, file));
}
