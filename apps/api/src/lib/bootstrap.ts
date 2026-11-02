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
    await bootstrapDemoCompany();
  }
}

async function bootstrapDemoCompany(): Promise<void> {
  const cnpj = "00000000000191";
  let company = await prisma.company.findUnique({ where: { cnpj } });
  if (!company) {
    company = await prisma.company.create({
      data: {
        razaoSocial: "EMPRESA DEMO GATEWAY FISCAL LTDA",
        nomeFantasia: "Demo GF",
        cnpj,
        ie: "ISENTO",
        regime: "Simples Nacional",
        uf: "SP",
        municipio: "Sao Paulo",
        codigoIbge: "3550308",
        ambiente: "homologacao",
      },
    });
    console.log(`[bootstrap] Empresa demo criada: ${company.id}`);
  }

  const existingKey = await prisma.apiKey.findFirst({
    where: { companyId: company.id, label: "demo-homolog", active: true },
  });
  if (!existingKey) {
    const generated = generateApiKey();
    await prisma.apiKey.create({
      data: {
        companyId: company.id,
        label: "demo-homolog",
        keyHash: generated.hash,
        keyPrefix: generated.prefix,
        ambiente: "homologacao",
      },
    });
    console.log(`[bootstrap] API Key demo (copie agora): ${generated.raw}`);
  }
}
