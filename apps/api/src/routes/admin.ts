import type { FastifyInstance } from "fastify";
import { generateApiKey, hashPassword, requireSession, verifyPassword } from "../lib/auth.js";
import { encryptBytes, encryptText } from "../lib/crypto.js";
import type { Env } from "../lib/env.js";
import { prisma } from "../lib/prisma.js";
import { pingRedis } from "../lib/redis.js";

function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export async function adminRoutes(app: FastifyInstance, env: Env) {
  const encryptionSecret = env.SESSION_SECRET;
  app.get("/admin/login", async (request, reply) => {
    if (request.cookies.gf_session) {
      return reply.redirect("/admin");
    }
    return reply.view("login.ejs", { error: null });
  });

  app.post("/admin/login", async (request, reply) => {
    const body = request.body as { email?: string; password?: string };
    const user = await prisma.user.findUnique({ where: { email: body.email?.toLowerCase().trim() || "" } });
    if (!user || !(await verifyPassword(body.password || "", user.passwordHash)) || !user.active) {
      return reply.view("login.ejs", { error: "Credenciais inválidas." });
    }
    reply.setCookie("gf_session", user.id, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: env.NODE_ENV === "production",
      signed: false,
      maxAge: 60 * 60 * 24 * 7,
    });
    return reply.redirect("/admin");
  });

  app.post("/admin/logout", async (_request, reply) => {
    reply.clearCookie("gf_session", { path: "/" });
    return reply.redirect("/admin/login");
  });

  app.get("/admin", async (request, reply) => {
    const user = await requireSession(request, reply);
    if (!user) return;

    const redis = await pingRedis(env.REDIS_URL);
    let postgresOk = true;
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      postgresOk = false;
    }

    const companies = await prisma.company.findMany({
      orderBy: { razaoSocial: "asc" },
      include: { certificate: true, _count: { select: { documents: true, fiscalRules: true } } },
    });

    return reply.view("dashboard.ejs", {
      user,
      health: {
        postgres: postgresOk,
        redis: redis.ok,
        redisDetail: redis.ok ? `${redis.latencyMs ?? ""}ms` : redis.error,
      },
      companies,
    });
  });

  app.get("/admin/empresas", async (request, reply) => {
    const user = await requireSession(request, reply, ["ADMIN", "CONTADOR"]);
    if (!user) return;
    const companies = await prisma.company.findMany({
      orderBy: { razaoSocial: "asc" },
      include: { certificate: true, _count: { select: { fiscalRules: true, apiKeys: true } } },
    });
    return reply.view("empresas.ejs", { user, companies });
  });

  app.get("/admin/empresas/nova", async (request, reply) => {
    const user = await requireSession(request, reply, ["ADMIN", "CONTADOR"]);
    if (!user) return;
    return reply.view("empresa-form.ejs", { user, company: null, error: null });
  });

  app.post("/admin/empresas", async (request, reply) => {
    const user = await requireSession(request, reply, ["ADMIN", "CONTADOR"]);
    if (!user) return;
    const body = request.body as Record<string, string>;
    const cnpj = onlyDigits(body.cnpj || "");
    if (cnpj.length !== 14) {
      return reply.view("empresa-form.ejs", {
        user,
        company: body,
        error: "CNPJ deve ter 14 dígitos.",
      });
    }
    try {
      const company = await prisma.company.create({
        data: {
          razaoSocial: body.razaoSocial,
          nomeFantasia: body.nomeFantasia || null,
          cnpj,
          ie: body.ie || null,
          im: body.im || null,
          regime: body.regime || null,
          emailFiscal: body.emailFiscal || null,
          telefone: body.telefone || null,
          cep: onlyDigits(body.cep || "") || null,
          logradouro: body.logradouro || null,
          numero: body.numero || null,
          complemento: body.complemento || null,
          bairro: body.bairro || null,
          municipio: body.municipio || null,
          uf: (body.uf || "").toUpperCase() || null,
          codigoIbge: body.codigoIbge || null,
          serieNfe: Number(body.serieNfe || 1),
          proximoNumeroNfe: Number(body.proximoNumeroNfe || 1),
        },
      });
      return reply.redirect(`/admin/empresas/${company.id}`);
    } catch {
      return reply.view("empresa-form.ejs", {
        user,
        company: body,
        error: "Não foi possível salvar. CNPJ já existe?",
      });
    }
  });

  app.get("/admin/empresas/:id", async (request, reply) => {
    const user = await requireSession(request, reply);
    if (!user) return;
    const { id } = request.params as { id: string };
    const company = await prisma.company.findUnique({
      where: { id },
      include: {
        certificate: true,
        fiscalRules: { orderBy: { grupoProduto: "asc" } },
        apiKeys: { orderBy: { createdAt: "desc" } },
        documents: { orderBy: { createdAt: "desc" }, take: 20 },
      },
    });
    if (!company) return reply.code(404).send("Empresa não encontrada");

    if (user.role === "EMPRESA") {
      const link = await prisma.userCompany.findUnique({
        where: { userId_companyId: { userId: user.id, companyId: id } },
      });
      if (!link) return reply.code(403).send("Acesso negado");
    }

    return reply.view("empresa-detalhe.ejs", {
      user,
      company,
      flash: (request.query as { flash?: string }).flash || null,
      rawKey: null,
    });
  });

  app.post("/admin/empresas/:id", async (request, reply) => {
    const user = await requireSession(request, reply, ["ADMIN", "CONTADOR"]);
    if (!user) return;
    const { id } = request.params as { id: string };
    const body = request.body as Record<string, string>;
    await prisma.company.update({
      where: { id },
      data: {
        razaoSocial: body.razaoSocial,
        nomeFantasia: body.nomeFantasia || null,
        ie: body.ie || null,
        im: body.im || null,
        regime: body.regime || null,
        emailFiscal: body.emailFiscal || null,
        telefone: body.telefone || null,
        cep: onlyDigits(body.cep || "") || null,
        logradouro: body.logradouro || null,
        numero: body.numero || null,
        complemento: body.complemento || null,
        bairro: body.bairro || null,
        municipio: body.municipio || null,
        uf: (body.uf || "").toUpperCase() || null,
        codigoIbge: body.codigoIbge || null,
        serieNfe: Number(body.serieNfe || 1),
        proximoNumeroNfe: Number(body.proximoNumeroNfe || 1),
        homologacaoOk: body.homologacaoOk === "on",
      },
    });
    return reply.redirect(`/admin/empresas/${id}?flash=dados_salvos`);
  });

  app.post("/admin/empresas/:id/ambiente", async (request, reply) => {
    const user = await requireSession(request, reply, ["ADMIN"]);
    if (!user) return;
    const { id } = request.params as { id: string };
    const body = request.body as { ambiente?: string; producaoLiberada?: string };
    await prisma.company.update({
      where: { id },
      data: {
        ambiente: body.ambiente === "producao" ? "producao" : "homologacao",
        producaoLiberada: body.producaoLiberada === "on",
      },
    });
    return reply.redirect(`/admin/empresas/${id}?flash=ambiente_atualizado`);
  });

  app.post("/admin/empresas/:id/certificado", async (request, reply) => {
    const user = await requireSession(request, reply, ["ADMIN", "CONTADOR"]);
    if (!user) return;
    const { id } = request.params as { id: string };

    let fileBuf: Buffer | null = null;
    let filename = "certificado.pfx";
    let password = "";

    for await (const part of request.parts()) {
      if (part.type === "file" && part.fieldname === "file") {
        const chunks: Buffer[] = [];
        for await (const chunk of part.file) chunks.push(Buffer.from(chunk));
        fileBuf = Buffer.concat(chunks);
        filename = part.filename || filename;
      } else if (part.type === "field" && part.fieldname === "password") {
        password = String(part.value || "");
      }
    }

    if (!fileBuf) return reply.redirect(`/admin/empresas/${id}?flash=cert_ausente`);

    const fileEncrypted = Uint8Array.from(encryptBytes(fileBuf, encryptionSecret));
    const passwordEnc = encryptText(password, encryptionSecret);
    await prisma.certificate.upsert({
      where: { companyId: id },
      create: {
        companyId: id,
        fileEncrypted,
        passwordEnc,
        subject: filename,
        validTo: null,
      },
      update: {
        fileEncrypted,
        passwordEnc,
        subject: filename,
      },
    });
    return reply.redirect(`/admin/empresas/${id}?flash=cert_salvo`);
  });

  app.post("/admin/empresas/:id/regras", async (request, reply) => {
    const user = await requireSession(request, reply, ["ADMIN", "CONTADOR"]);
    if (!user) return;
    const { id } = request.params as { id: string };
    const body = request.body as Record<string, string>;
    await prisma.fiscalRule.create({
      data: {
        companyId: id,
        grupoProduto: body.grupoProduto,
        ncm: onlyDigits(body.ncm || ""),
        cfopDentro: body.cfopDentro || null,
        cfopFora: body.cfopFora || null,
        cstOuCsosn: body.cstOuCsosn || null,
        naturezaOperacao: body.naturezaOperacao || null,
        infosComplementares: body.infosComplementares || null,
        revisado: body.revisado === "on",
      },
    });
    return reply.redirect(`/admin/empresas/${id}?flash=regra_criada`);
  });

  app.post("/admin/empresas/:id/api-keys", async (request, reply) => {
    const user = await requireSession(request, reply, ["ADMIN"]);
    if (!user) return;
    const { id } = request.params as { id: string };
    const body = request.body as { label?: string; ambiente?: string };
    const generated = generateApiKey();
    await prisma.apiKey.create({
      data: {
        companyId: id,
        label: body.label || "erp",
        keyHash: generated.hash,
        keyPrefix: generated.prefix,
        ambiente: body.ambiente === "producao" ? "producao" : "homologacao",
      },
    });

    const company = await prisma.company.findUniqueOrThrow({
      where: { id },
      include: {
        certificate: true,
        fiscalRules: { orderBy: { grupoProduto: "asc" } },
        apiKeys: { orderBy: { createdAt: "desc" } },
        documents: { orderBy: { createdAt: "desc" }, take: 20 },
      },
    });

    return reply.view("empresa-detalhe.ejs", {
      user,
      company,
      flash: "api_key_criada",
      rawKey: generated.raw,
    });
  });

  app.get("/admin/health", async (request, reply) => {
    const user = await requireSession(request, reply, ["ADMIN", "CONTADOR"]);
    if (!user) return;
    const redis = await pingRedis(env.REDIS_URL);
    let postgresOk = true;
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      postgresOk = false;
    }
    const certs = await prisma.certificate.findMany({
      include: { company: { select: { razaoSocial: true, cnpj: true } } },
    });
    return reply.view("health.ejs", { user, postgresOk, redis, certs });
  });

  app.get("/admin/usuarios", async (request, reply) => {
    const user = await requireSession(request, reply, ["ADMIN"]);
    if (!user) return;
    const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });
    return reply.view("usuarios.ejs", { user, users, error: null });
  });

  app.post("/admin/usuarios", async (request, reply) => {
    const user = await requireSession(request, reply, ["ADMIN"]);
    if (!user) return;
    const body = request.body as {
      email?: string;
      name?: string;
      password?: string;
      role?: "ADMIN" | "CONTADOR" | "EMPRESA";
    };
    try {
      await prisma.user.create({
        data: {
          email: (body.email || "").toLowerCase().trim(),
          name: body.name || "",
          role: body.role || "EMPRESA",
          passwordHash: await hashPassword(body.password || "changeme123"),
        },
      });
      return reply.redirect("/admin/usuarios");
    } catch {
      const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });
      return reply.view("usuarios.ejs", { user, users, error: "Não foi possível criar o usuário." });
    }
  });
}
