import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.string().default("development"),
  PORT: z.coerce.number().default(3080),
  HOST: z.string().default("0.0.0.0"),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  SESSION_SECRET: z.string().min(16),
  SEFAZ_MODE: z.enum(["mock", "sefaz"]).default("mock"),
  BOOTSTRAP_ADMIN_EMAIL: z.string().email().optional(),
  BOOTSTRAP_ADMIN_PASSWORD: z.string().min(8).optional(),
  BOOTSTRAP_CONTADOR_EMAIL: z.string().email().optional(),
  BOOTSTRAP_CONTADOR_PASSWORD: z.string().min(8).optional(),
  BOOTSTRAP_DEMO_COMPANY: z
    .string()
    .optional()
    .transform((v) => v === "true" || v === "1"),
  BOOTSTRAP_DEMO_WEBHOOK_URL: z.string().url().optional(),
  BOOTSTRAP_DEMO_WEBHOOK_SECRET: z.string().optional(),
});

export type Env = z.infer<typeof schema>;

export function loadEnv(): Env {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    console.error(parsed.error.flatten().fieldErrors);
    throw new Error("Variáveis de ambiente inválidas");
  }
  return parsed.data;
}
