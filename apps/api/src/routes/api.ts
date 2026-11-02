import type { FastifyInstance } from "fastify";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { requireApiKey } from "../lib/auth.js";
import { prisma } from "../lib/prisma.js";

const emitSchema = z.object({
  externalId: z.string().optional(),
  destinatario: z.record(z.unknown()),
  itens: z.array(z.record(z.unknown())).min(1),
  totais: z.record(z.unknown()).optional(),
});

export async function apiRoutes(app: FastifyInstance) {
  app.post("/v1/nfe", async (request, reply) => {
    const companyId = await requireApiKey(request, reply);
    if (!companyId) return;

    const parsed = emitSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_payload", details: parsed.error.flatten() });
    }

    const company = await prisma.company.findUniqueOrThrow({ where: { id: companyId } });
    const doc = await prisma.document.create({
      data: {
        companyId,
        externalId: parsed.data.externalId,
        status: "na_fila",
        serie: company.serieNfe,
        numero: company.proximoNumeroNfe,
        payloadJson: parsed.data as Prisma.InputJsonValue,
      },
    });

    await prisma.company.update({
      where: { id: companyId },
      data: { proximoNumeroNfe: { increment: 1 } },
    });

    // Motor SEFAZ entra na fase seguinte; por enquanto enfileira.
    return reply.code(202).send({
      id: doc.id,
      status: doc.status,
      message: "Documento aceito na fila. Emissão SEFAZ ainda não ligada nesta fase.",
    });
  });

  app.get("/v1/nfe/:id", async (request, reply) => {
    const companyId = await requireApiKey(request, reply);
    if (!companyId) return;
    const { id } = request.params as { id: string };
    const doc = await prisma.document.findFirst({ where: { id, companyId } });
    if (!doc) return reply.code(404).send({ error: "not_found" });
    return {
      id: doc.id,
      status: doc.status,
      serie: doc.serie,
      numero: doc.numero,
      chaveAcesso: doc.chaveAcesso,
      protocolo: doc.protocolo,
      rejectionCode: doc.rejectionCode,
      rejectionMsg: doc.rejectionMsg,
      externalId: doc.externalId,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  });
}
