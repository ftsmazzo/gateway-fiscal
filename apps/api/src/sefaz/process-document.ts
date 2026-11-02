import { prisma } from "../lib/prisma.js";
import { decryptBytes, decryptText } from "../lib/crypto.js";
import type { SefazAdapter } from "./types.js";

export async function processDocument(
  documentId: string,
  adapter: SefazAdapter,
  encryptionSecret: string,
): Promise<void> {
  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    include: {
      company: { include: { certificate: true } },
    },
  });

  if (!doc) {
    console.warn(`[worker] documento ${documentId} não encontrado`);
    return;
  }

  if (doc.status !== "na_fila" && doc.status !== "processando") {
    console.info(`[worker] documento ${documentId} status=${doc.status}, ignorando`);
    return;
  }

  await prisma.document.update({
    where: { id: documentId },
    data: { status: "processando" },
  });

  let certificatePfx: Buffer | undefined;
  let certificatePassword: string | undefined;
  if (doc.company.certificate) {
    try {
      certificatePfx = decryptBytes(doc.company.certificate.fileEncrypted, encryptionSecret);
      certificatePassword = decryptText(doc.company.certificate.passwordEnc, encryptionSecret);
    } catch (err) {
      console.warn(`[worker] falha ao descriptografar certificado:`, err);
    }
  }

  const result = await adapter.emit({
    documentId: doc.id,
    company: {
      id: doc.company.id,
      cnpj: doc.company.cnpj,
      razaoSocial: doc.company.razaoSocial,
      ie: doc.company.ie,
      uf: doc.company.uf,
      ambiente: doc.company.ambiente,
      serie: doc.serie ?? doc.company.serieNfe,
      numero: doc.numero ?? doc.company.proximoNumeroNfe,
    },
    payload: doc.payloadJson,
    certificatePfx,
    certificatePassword,
  });

  if (result.ok) {
    await prisma.document.update({
      where: { id: documentId },
      data: {
        status: "autorizada",
        chaveAcesso: result.chaveAcesso,
        protocolo: result.protocolo,
        xmlStorage: result.xml,
        rejectionCode: null,
        rejectionMsg: null,
      },
    });
    console.info(`[worker] ${documentId} autorizada chave=${result.chaveAcesso} via ${adapter.name}`);
    return;
  }

  await prisma.document.update({
    where: { id: documentId },
    data: {
      status: "rejeitada",
      rejectionCode: result.code,
      rejectionMsg: result.message,
    },
  });
  console.warn(`[worker] ${documentId} rejeitada ${result.code}: ${result.message}`);
}
