import { loadEnv } from "./lib/env.js";
import { getRedis } from "./lib/redis.js";
import { blockingPopNfe, touchWorkerHeartbeat } from "./lib/queue.js";
import { createSefazAdapter } from "./sefaz/index.js";
import { processDocument } from "./sefaz/process-document.js";

async function main() {
  const env = loadEnv();
  const adapter = createSefazAdapter(env.SEFAZ_MODE);
  const redis = getRedis(env.REDIS_URL);
  if (redis.status !== "ready") await redis.connect();

  console.log(`[worker] iniciado mode=${adapter.name} redis ok`);

  for (;;) {
    try {
      await touchWorkerHeartbeat(redis);
      const documentId = await blockingPopNfe(redis, 5);
      if (!documentId) continue;
      await processDocument(documentId, adapter, env.SESSION_SECRET);
    } catch (err) {
      console.error("[worker] erro no loop", err);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
