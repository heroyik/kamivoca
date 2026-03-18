import { promises as fs } from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const outDir = path.join(projectRoot, "out");
const outputPath = path.join(outDir, "offline-assets.json");
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "/kamivoca";

async function collectFiles(dir, predicate) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        return collectFiles(fullPath, predicate);
      }
      return predicate(fullPath) ? [fullPath] : [];
    }),
  );

  return files.flat();
}

function toPublicUrl(filePath) {
  const relativePath = path.relative(outDir, filePath).split(path.sep).join("/");
  return `${basePath}/${relativePath}`.replace(/\/+/g, "/");
}

async function main() {
  const staticDir = path.join(outDir, "_next", "static");
  const imagesDir = path.join(outDir, "images");
  const soundsDir = path.join(outDir, "sounds");

  const staticFiles = await collectFiles(staticDir, (filePath) =>
    /\.(css|js|json|ico|png|jpg|jpeg|svg|woff2?)$/i.test(filePath),
  );

  const optionalDirs = [imagesDir, soundsDir];
  const mediaFiles = [];

  for (const dir of optionalDirs) {
    try {
      await fs.access(dir);
      mediaFiles.push(
        ...(await collectFiles(dir, (filePath) =>
          /\.(mp3|wav|ogg|m4a|png|jpg|jpeg|svg|ico)$/i.test(filePath),
        )),
      );
    } catch {
      // Directory is optional.
    }
  }

  const assetUrls = Array.from(
    new Set([...staticFiles, ...mediaFiles].map(toPublicUrl)),
  ).sort();

  await fs.writeFile(outputPath, `${JSON.stringify(assetUrls, null, 2)}\n`, "utf8");
  console.log(`[offline-manifest] wrote ${assetUrls.length} assets to ${path.relative(projectRoot, outputPath)}`);
}

await main();
