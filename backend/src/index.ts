import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { networkInterfaces } from "os";

const app = new Elysia()
  .use(cors())
  .get("/", () => "Network API is running on Bun!")
  .get("/network", () => {
    const nets = networkInterfaces();
    const results: { name: string; ip: string }[] = [];

    for (const name of Object.keys(nets)) {
      const interfaces = nets[name];
      if (interfaces) {
        for (const net of interfaces) {
          // Only return IPv4 and non-internal IPs
          if (net.family === 'IPv4' && !net.internal) {
            results.push({
              name: name,
              ip: net.address
            });
          }
        }
      }
    }
    return results;
  })
  .listen(3000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);