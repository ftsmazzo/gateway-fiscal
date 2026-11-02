import { createHmac } from "node:crypto";
import type { Document } from "@prisma/client";

export type WebhookEvent = "nfe.autorizada" | "nfe.rejeitada";

export async function dispatchDocumentWebhook(
  event: WebhookEvent,
  doc: Document,
  company: { webhookUrl: string | null; webhookSecret: string | null },
): Promise<void> {
  const url = company.webhookUrl?.trim();
  if (!url) return;

  const body = {
    event,
    id: doc.id,
    externalId: doc.externalId,
    status: doc.status,
    serie: doc.serie,
    numero: doc.numero,
    chaveAcesso: doc.chaveAcesso,
    protocolo: doc.protocolo,
    rejectionCode: doc.rejectionCode,
    rejectionMsg: doc.rejectionMsg,
    ts: new Date().toISOString(),
  };
  const raw = JSON.stringify(body);
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "user-agent": "gateway-fiscal-webhook/1.0",
    "x-gf-event": event,
  };
  if (company.webhookSecret) {
    headers["x-gf-webhook-secret"] = company.webhookSecret;
    headers["x-gf-signature"] = createHmac("sha256", company.webhookSecret)
      .update(raw)
      .digest("hex");
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: raw,
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      console.warn(`[webhook] ${event} doc=${doc.id} status=${res.status}`);
    } else {
      console.info(`[webhook] ${event} doc=${doc.id} ok`);
    }
  } catch (err) {
    console.warn(`[webhook] ${event} doc=${doc.id} falhou`, err);
  }
}
