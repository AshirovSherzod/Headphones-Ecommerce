import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const port = Number(process.env.PORT || 4173);
const types = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".webp": "image/webp",
};

const server = createServer(async (request, response) => {
    if (!["GET", "HEAD"].includes(request.method)) {
        response.writeHead(405, { Allow: "GET, HEAD" }).end();
        return;
    }
    try {
        const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
        const relative = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
        const publicFile =
            ["index.html", "favicon.svg"].includes(relative) || /^(css|js|images)\//.test(relative);
        const filename = resolve(root, relative);
        if (!publicFile || !filename.startsWith(resolve(root) + sep)) {
            response.writeHead(404).end("Not found");
            return;
        }
        const content = await readFile(filename);
        response.writeHead(200, {
            "Content-Type": types[extname(filename)] || "application/octet-stream",
            "Content-Length": content.length,
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
        });
        response.end(request.method === "HEAD" ? undefined : content);
    } catch {
        response.writeHead(404).end("Not found");
    }
});

server.listen(port, "127.0.0.1", () => {
    console.log(`Headphones demo: http://127.0.0.1:${server.address().port}`);
});
