import type { FastifyInstance } from "fastify";
import type { Env } from "../lib/env.js";
import { prisma } from "../lib/prisma.js";
import { pingRedis } from "../lib/redis.js";

export async function healthRoutes(app: FastifyInstance, env: Env) {
  app.get("/health", async (_request, reply) => {
    const checks: Record<string, { ok: boolean; detail?: string }> = {};

    try {
      await prisma.$queryRaw`SELECT 1`;
      checks.postgres = { ok: true };
    } catch (err) {
      checks.postgres = {
        ok: false,
        detail: err instanceof Error ? err.message : "db_error",
      };
    }

    const redis = await pingRedis(env.REDIS_URL);
    checks.redis = {
      ok: redis.ok,
      detail: redis.ok ? `${redis.latencyMs}ms` : redis.error,
    };

    const companies = await prisma.company.count().catch(() => 0);
    const certsExpiring = await prisma.certificate
      .count({
        where: {
          validTo: {
            lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            gte: new Date(),
          },
        },
      })
      .catch(() => 0);

    checks.certificates = {
      ok: true,
      detail: `expiring_30d=${certsExpiring}`,
    };

    const allOk = Object.values(checks).every((c) => c.ok);
    const status = allOk ? "ok" : checks.postgres.ok ? "degraded" : "down";

    return reply.code(allOk ? 200 : 503).send({
      status,
      service: "gateway-fiscal",
      companies,
      checks,
      ts: new Date().toISOString(),
    });
  });
}
