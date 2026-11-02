import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { Role, User } from "@prisma/client";
import { prisma } from "./prisma.js";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function hashApiKey(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export function generateApiKey(): { raw: string; prefix: string; hash: string } {
  const raw = `gf_${randomBytes(24).toString("base64url")}`;
  return { raw, prefix: raw.slice(0, 10), hash: hashApiKey(raw) };
}

export type SessionUser = Pick<User, "id" | "email" | "name" | "role">;

declare module "fastify" {
  interface FastifyRequest {
    sessionUser?: SessionUser;
    apiCompanyId?: string;
  }
}

export async function requireSession(
  request: FastifyRequest,
  reply: FastifyReply,
  roles?: Role[],
): Promise<SessionUser | null> {
  const userId = request.cookies.gf_session;
  if (!userId) {
    reply.redirect("/admin/login");
    return null;
  }
  const user = await prisma.user.findFirst({
    where: { id: userId, active: true },
    select: { id: true, email: true, name: true, role: true },
  });
  if (!user) {
    reply.clearCookie("gf_session", { path: "/" });
    reply.redirect("/admin/login");
    return null;
  }
  if (roles && !roles.includes(user.role)) {
    reply.code(403).send("Acesso negado para este papel.");
    return null;
  }
  request.sessionUser = user;
  return user;
}

export async function requireApiKey(request: FastifyRequest, reply: FastifyReply): Promise<string | null> {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    reply.code(401).send({ error: "missing_api_key" });
    return null;
  }
  const raw = header.slice("Bearer ".length).trim();
  const key = await prisma.apiKey.findFirst({
    where: { keyHash: hashApiKey(raw), active: true },
  });
  if (!key) {
    reply.code(401).send({ error: "invalid_api_key" });
    return null;
  }
  await prisma.apiKey.update({
    where: { id: key.id },
    data: { lastUsedAt: new Date() },
  });
  request.apiCompanyId = key.companyId;
  return key.companyId;
}

export function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}
