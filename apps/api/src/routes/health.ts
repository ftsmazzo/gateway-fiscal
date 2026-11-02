import type { FastifyInstance } from "fastify";
import type { Env } from "../lib/env.js";
import { prisma } from "../lib/prisma.js";
import { pingRedis } from "../lib/redis.js";
import { queueDepth, readWorkerHeartbeat } from "../lib/queue.js";

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

    let depth = 0;
    let heartbeat: string | null = null;
    if (redis.ok) {
      try {
        depth = await queueDepth(env.REDIS_URL);
        heartbeat = await readWorkerHeartbeat(env.REDIS_URL);
      } catch (err) {
        checks.queue = {
          ok: false,
          detail: err instanceof Error ? err.message : "queue_error",
        };
      }
    }

    const workerFresh =
      !!heartbeat && Date.now() - new Date(heartbeat).getTime() < 90_000;
    checks.worker = {
      ok: workerFresh,
      detail: heartbeat ? `last=${heartbeat}` : "no_heartbeat",
    };
    checks.queue = checks.queue ?? { ok: true, detail: `depth=${depth}` };
    checks.sefazMode = { ok: true, detail: env.SEFAZ_MODE };

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

    // Worker ausente = degraded (API ainda sobe), postgres/redis down = down
    const criticalOk = checks.postgres.ok && checks.redis.ok;
    const allOk = criticalOk && checks.worker.ok;
    const status = allOk ? "ok" : criticalOk ? "degraded" : "down";

    return reply.code(criticalOk ? 200 : 503).send({
      status,
      service: "gateway-fiscal",
      companies,
      checks,
      ts: new Date().toISOString(),
    });
  });
}
