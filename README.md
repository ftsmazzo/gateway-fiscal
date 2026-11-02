# Gateway Fiscal

API + painel internos para emissão de **NF-e** nos projetos da Fábrica IA (uso exclusivo — não é SaaS comercial).

## Papéis

- **Admin** — plataforma, API keys, liberar produção  
- **Contador** (sócio) — configura **qualquer** empresa (dados, certificado, regras)  
- **Empresa** — acompanha documentos da sua empresa  
- **ERP** — consome a API com **API Key**

Detalhes: [docs/ROLES.md](docs/ROLES.md) · Telas: [docs/UIUX.md](docs/UIUX.md)

## Serviços (EasyPanel)

| Serviço | Função |
|---------|--------|
| `api` | Painel + API REST + `/health` |
| `postgres` | Dados |
| `redis` | Fila / cache |
| `worker` | (fase seguinte) processamento SEFAZ |

## Desenvolvimento local

```bash
cd apps/api
cp .env.example .env
npm install
npx prisma migrate deploy
npm run dev
```

- Health: `http://localhost:3080/health`  
- Painel: `http://localhost:3080/admin`

## Segurança (repo público)

Não commit: `.env`, `*.pfx`, senhas, API keys reais, XML de produção com dados sensíveis.
