import { cp, mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const output = new URL("dist/", root);
await mkdir(output, { recursive: true });
for (const path of ["index.html", "favicon.svg", "css", "js", "images"]) {
    await cp(new URL(path, root), new URL(path, output), { recursive: true });
}
await writeFile(new URL(".nojekyll", output), "");
console.log(`Static demo prepared in ${fileURLToPath(output)}`);
