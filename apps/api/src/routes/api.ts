import type { FastifyInstance } from "fastify";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { requireApiKey } from "../lib/auth.js";
import type { Env } from "../lib/env.js";
import { prisma } from "../lib/prisma.js";
import { enqueueNfe } from "../lib/queue.js";

const emitSchema = z.object({
  externalId: z.string().optional(),
  destinatario: z.record(z.unknown()),
  itens: z.array(z.record(z.unknown())).min(1),
  totais: z.record(z.unknown()).optional(),
});

export async function apiRoutes(app: FastifyInstance, env: Env) {
  app.get("/v1/company", async (request, reply) => {
    const companyId = await requireApiKey(request, reply);
    if (!companyId) return;
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: { certificate: { select: { id: true } } },
    });
    if (!company) return reply.code(404).send({ error: "not_found" });
    return {
      id: company.id,
      razaoSocial: company.razaoSocial,
      cnpj: company.cnpj,
      ie: company.ie,
      regime: company.regime,
      uf: company.uf,
      municipio: company.municipio,
      ambiente: company.ambiente,
      hasCertificate: Boolean(company.certificate),
    };
  });

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

    await enqueueNfe(env.REDIS_URL, doc.id);

    return reply.code(202).send({
      id: doc.id,
      status: doc.status,
      message: "Documento enfileirado para emissão.",
      sefazMode: env.SEFAZ_MODE,
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

  app.get("/v1/nfe/:id/xml", async (request, reply) => {
    const companyId = await requireApiKey(request, reply);
    if (!companyId) return;
    const { id } = request.params as { id: string };
    const doc = await prisma.document.findFirst({ where: { id, companyId } });
    if (!doc) return reply.code(404).send({ error: "not_found" });
    if (!doc.xmlStorage) return reply.code(404).send({ error: "xml_not_ready" });
    reply.header("content-type", "application/xml; charset=utf-8");
    return reply.send(doc.xmlStorage);
  });
}
