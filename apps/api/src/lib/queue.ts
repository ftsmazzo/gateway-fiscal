import type { Redis as RedisClient } from "ioredis";
import { getRedis } from "./redis.js";

export const QUEUE_NFE = "gf:queue:nfe";
export const WORKER_HEARTBEAT_KEY = "gf:worker:heartbeat";

export async function enqueueNfe(redisUrl: string, documentId: string): Promise<void> {
  const redis = getRedis(redisUrl);
  if (redis.status !== "ready") await redis.connect();
  await redis.lpush(QUEUE_NFE, documentId);
}

export async function queueDepth(redisUrl: string): Promise<number> {
  const redis = getRedis(redisUrl);
  if (redis.status !== "ready") await redis.connect();
  return redis.llen(QUEUE_NFE);
}

export async function touchWorkerHeartbeat(redis: RedisClient): Promise<void> {
  await redis.set(WORKER_HEARTBEAT_KEY, new Date().toISOString(), "EX", 60);
}

export async function readWorkerHeartbeat(redisUrl: string): Promise<string | null> {
  const redis = getRedis(redisUrl);
  if (redis.status !== "ready") await redis.connect();
  return redis.get(WORKER_HEARTBEAT_KEY);
}

export async function blockingPopNfe(redis: RedisClient, timeoutSec = 5): Promise<string | null> {
  const result = await redis.brpop(QUEUE_NFE, timeoutSec);
  return result?.[1] ?? null;
}
