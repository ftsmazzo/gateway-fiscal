import { Redis as RedisClient } from "ioredis";

let client: RedisClient | null = null;

export function getRedis(url: string): RedisClient {
  if (!client) {
    client = new RedisClient(url, {
      maxRetriesPerRequest: 1,
      enableReadyCheck: true,
      lazyConnect: true,
    });
  }
  return client;
}

export async function pingRedis(url: string): Promise<{ ok: boolean; latencyMs?: number; error?: string }> {
  const started = Date.now();
  try {
    const redis = getRedis(url);
    if (redis.status !== "ready") {
      await redis.connect();
    }
    const pong = await redis.ping();
    return { ok: pong === "PONG", latencyMs: Date.now() - started };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "redis_error" };
  }
}
