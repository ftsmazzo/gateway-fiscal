import path from "node:path";
import { fileURLToPath } from "node:url";
import Fastify from "fastify";
import cookie from "@fastify/cookie";
import formbody from "@fastify/formbody";
import multipart from "@fastify/multipart";
import view from "@fastify/view";
import ejs from "ejs";
import { loadEnv } from "./lib/env.js";
import { bootstrapUsers } from "./lib/bootstrap.js";
import { adminRoutes } from "./routes/admin.js";
import { apiRoutes } from "./routes/api.js";
import { healthRoutes } from "./routes/health.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const env = loadEnv();
  const app = Fastify({ logger: true });

  await app.register(cookie, { secret: env.SESSION_SECRET });
  await app.register(formbody);
  await app.register(multipart, { limits: { fileSize: 5 * 1024 * 1024 } });
  await app.register(view, {
    engine: { ejs },
    root: path.join(__dirname, "views"),
    viewExt: "ejs",
  });

  await healthRoutes(app, env);
  await apiRoutes(app);
  await adminRoutes(app, env);

  app.get("/", async (_request, reply) => reply.redirect("/admin"));

  await bootstrapUsers(env);

  await app.listen({ port: env.PORT, host: env.HOST });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
