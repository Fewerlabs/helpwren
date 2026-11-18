// Serves this folder at http://127.0.0.1:4100, a different site from the Helpwren app on
// localhost:3000, which is what makes it a fair test of the widget. Usage: node serve.mjs
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";

const PORT = 4100;
// The pages this site has, by address. Nothing else is served, so no path reaches the disk.
const pages = {
  "/": new URL("./index.html", import.meta.url),
  "/inline": new URL("./inline.html", import.meta.url),
};

createServer(async (request, response) => {
  const page = pages[request.url ?? ""];
  if (!page) {
    response.writeHead(404).end("Not found");
    return;
  }
  response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  response.end(await readFile(page));
}).listen(PORT, "127.0.0.1", () => {
  console.log(`Example site: http://127.0.0.1:${PORT}`);
});
