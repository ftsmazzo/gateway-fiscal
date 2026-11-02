# AGENTS.md — Gateway Fiscal

## Produto

Gateway interno (não SaaS) para NF-e nos projetos da Fábrica IA.  
Repo/EasyPanel exclusivos: `gateway-fiscal`. Não misturar com `gestao-epi`.

## Papéis

- **ADMIN** — plataforma, API keys, liberar produção  
- **CONTADOR** — sócio; configura **todas** as empresas  
- **EMPRESA** — só empresas vinculadas  
- **ERP** — API Key (`Authorization: Bearer …`)

## Segurança

- Nunca commitar `.env`, `*.pfx`, keys reais  
- Certificado só no painel Admin/Contador  
- Produção só com Health ok + Contador OK + Admin libera  

## Stack

- Node 22 + Fastify + Prisma + PostgreSQL + Redis  
- Painel EJS em `/admin`  
- `GET /health` público  

## Deploy EasyPanel

Serviços: `postgres`, `redis`, `api` (Dockerfile em `apps/api`).  
Worker SEFAZ: fase seguinte.
