import type { Env } from "./env.js";
import { generateApiKey, hashPassword } from "./auth.js";
import { prisma } from "./prisma.js";

export async function bootstrapUsers(env: Env): Promise<void> {
  if (env.BOOTSTRAP_ADMIN_EMAIL && env.BOOTSTRAP_ADMIN_PASSWORD) {
    const existing = await prisma.user.findUnique({ where: { email: env.BOOTSTRAP_ADMIN_EMAIL } });
    if (!existing) {
      await prisma.user.create({
        data: {
          email: env.BOOTSTRAP_ADMIN_EMAIL,
          name: "Administrador",
          role: "ADMIN",
          passwordHash: await hashPassword(env.BOOTSTRAP_ADMIN_PASSWORD),
        },
      });
      console.log(`[bootstrap] Admin criado: ${env.BOOTSTRAP_ADMIN_EMAIL}`);
    }
  }

  if (env.BOOTSTRAP_CONTADOR_EMAIL && env.BOOTSTRAP_CONTADOR_PASSWORD) {
    const existing = await prisma.user.findUnique({ where: { email: env.BOOTSTRAP_CONTADOR_EMAIL } });
    if (!existing) {
      await prisma.user.create({
        data: {
          email: env.BOOTSTRAP_CONTADOR_EMAIL,
          name: "Contador",
          role: "CONTADOR",
          passwordHash: await hashPassword(env.BOOTSTRAP_CONTADOR_PASSWORD),
        },
      });
      console.log(`[bootstrap] Contador criado: ${env.BOOTSTRAP_CONTADOR_EMAIL}`);
    }
  }

  if (env.BOOTSTRAP_DEMO_COMPANY) {
    await bootstrapDemoCompany(env);
  }
}

async function bootstrapDemoCompany(env: Env): Promise<void> {
  // EPICAT — dados oficiais (Daniel / NFE-GO-LIVE 29/10/2026)
  const cnpj = "69406699000190";
  const epicatData = {
    razaoSocial: "EPICAT DISTRIBUIDORA LTDA",
    nomeFantasia: "EPICAT",
    cnpj,
    ie: "260395253118",
    regime: "Simples Nacional",
    uf: "SP",
    municipio: "Catanduva",
    codigoIbge: "3511102",
    ambiente: "homologacao" as const,
  };

  let company = await prisma.company.findUnique({ where: { cnpj } });

  // Migra a demo antiga (00000000000191) para EPICAT, preservando API Keys.
  if (!company) {
    const oldDemo = await prisma.company.findUnique({ where: { cnpj: "00000000000191" } });
    if (oldDemo) {
      company = await prisma.company.update({
        where: { id: oldDemo.id },
        data: {
          ...epicatData,
          webhookUrl: env.BOOTSTRAP_DEMO_WEBHOOK_URL ?? oldDemo.webhookUrl,
          webhookSecret: env.BOOTSTRAP_DEMO_WEBHOOK_SECRET ?? oldDemo.webhookSecret,
        },
      });
      console.log(`[bootstrap] Demo migrada para EPICAT: ${company.id}`);
    }
  }

  if (!company) {
    company = await prisma.company.create({
      data: {
        ...epicatData,
        webhookUrl: env.BOOTSTRAP_DEMO_WEBHOOK_URL ?? null,
        webhookSecret: env.BOOTSTRAP_DEMO_WEBHOOK_SECRET ?? null,
      },
    });
    console.log(`[bootstrap] EPICAT criada: ${company.id}`);
  } else {
    company = await prisma.company.update({
      where: { id: company.id },
      data: {
        ...epicatData,
        ...(env.BOOTSTRAP_DEMO_WEBHOOK_URL
          ? {
              webhookUrl: env.BOOTSTRAP_DEMO_WEBHOOK_URL,
              webhookSecret: env.BOOTSTRAP_DEMO_WEBHOOK_SECRET ?? company.webhookSecret,
            }
          : {}),
      },
    });
    console.log(`[bootstrap] EPICAT atualizada: ${company.id}`);
  }

  // Se a demo antiga ainda existir em paralelo, traz docs e keys para a EPICAT.
  const oldDemo = await prisma.company.findUnique({ where: { cnpj: "00000000000191" } });
  if (oldDemo && oldDemo.id !== company.id) {
    const movedDocs = await prisma.document.updateMany({
      where: { companyId: oldDemo.id },
      data: { companyId: company.id },
    });
    const movedKeys = await prisma.apiKey.updateMany({
      where: { companyId: oldDemo.id },
      data: { companyId: company.id },
    });
    console.log(
      `[bootstrap] Migrados da demo → EPICAT: docs=${movedDocs.count} keys=${movedKeys.count}`,
    );
  }

  const existingKey = await prisma.apiKey.findFirst({
    where: { companyId: company.id, active: true },
  });
  if (!existingKey) {
    const generated = generateApiKey();
    await prisma.apiKey.create({
      data: {
        companyId: company.id,
        label: "epicat-homolog",
        keyHash: generated.hash,
        keyPrefix: generated.prefix,
        ambiente: "homologacao",
      },
    });
    console.log(`[bootstrap] API Key EPICAT (copie agora): ${generated.raw}`);
  }
}
