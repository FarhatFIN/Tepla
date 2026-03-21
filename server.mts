import next from "next";
import { createServer } from "http";
import { parse } from "url";
import { initSocketServer } from "./src/lib/socket-server.mts";

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

void app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url ?? "", true);
    void handle(req, res, parsedUrl);
  });

  initSocketServer(server);

  const port = Number(process.env.PORT ?? 3000);
  server.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`> Tepla server ready on http://localhost:${port}`);
  });
});

