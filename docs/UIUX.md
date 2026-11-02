# Telas — Gateway Fiscal (Fase 0–2)

Produto interno (não SaaS). Painel + API para projetos próprios (ex.: ProntoEPI / gestao-epi).

## Mapa de navegação

```
Login
 └─ Dashboard (Health + resumo)
     ├─ Empresas                    [ADMIN, CONTADOR]
     │    └─ Empresa (detalhe)
     │         ├─ Dados cadastrais       [CONTADOR + ADMIN]
     │         ├─ Certificado A1         [CONTADOR + ADMIN]
     │         ├─ Ambiente / Série       [CONTADOR; Produção: ADMIN]
     │         ├─ Regras fiscais         [CONTADOR]
     │         ├─ API Keys               [ADMIN]
     │         └─ Documentos (NF-e)      [todos; escopo por papel]
     ├─ Fila / Documentos (global)  [ADMIN, CONTADOR]
     ├─ Usuários                    [ADMIN]
     └─ Health                      [ADMIN, CONTADOR]
```

---

## 1. Login

- E-mail + senha
- Após login, redireciona ao Dashboard
- Sem cadastro público

---

## 2. Dashboard

**Objetivo:** ver se o gateway está saudável e o que falta por empresa.

Blocos:
- Status global: API · Postgres · Redis · Worker (verde/amarelo/vermelho)
- Lista rápida de empresas: ambiente (HOM/PROD), certificado (válido / vence em X dias / ausente), última NF
- Atalhos: “Nova empresa” (Admin), “Abrir empresa” (Contador)

---

## 3. Empresas (lista)

Colunas: Razão social · CNPJ · UF · Ambiente · Certificado · Pronto p/ homologação? · Pronto p/ produção?

Ações:
- Admin: Criar empresa
- Contador: Abrir qualquer empresa e configurar

### 3.1 Criar / editar empresa ( Contador preenche )

Campos:
- Razão social, Nome fantasia
- CNPJ, IE, IM (opcional)
- Regime tributário (Simples / Lucro Presumido / Lucro Real)
- Endereço completo (UF, município, CEP, IBGE)
- E-mail / telefone fiscal
- Série NF-e, próximo número
- Ambiente atual: `homologacao` | `producao` (produção só Admin libera)

Salvar não depende do ERP. Empresa nasce “rascunho fiscal”.

---

## 4. Certificado A1

- Upload `.pfx` + senha
- Exibe: titular, CNPJ do cert, validade, dias restantes
- Alerta visual se &lt; 30 dias
- Senha nunca retorna na API nem no front depois de salva
- Contador pode trocar o certificado de **qualquer** empresa

---

## 5. Regras fiscais

Tabela editável (e import CSV opcional depois):
- Grupo/produto (texto livre no início)
- NCM
- CFOP (dentro / fora UF)
- CST ou CSOSN
- PIS / COFINS / ICMS (alíquotas ou flags “deixar zerado / conforme regra”)
- Natureza da operação padrão
- Infos complementares padrão

Ações Contador: salvar, duplicar regra, marcar “revisado”.

Checklist na lateral: o que falta para homologação / produção.

---

## 6. API Keys (Admin)

Por empresa:
- Criar key (mostra uma vez)
- Revogar
- Label (ex.: `gestao-epi-homolog`)
- Ambiente da key (homolog / prod)

ERP usa só isso.

---

## 7. Documentos / Fila

Lista: data · empresa · número/série · chave · status · rejeição resumida

Status: `rascunho` → `na_fila` → `processando` → `autorizada` | `rejeitada` | `cancelada`

Detalhe: JSON enviado (sanitizado), XML, protocolo, DANFE, botões Cancelar / CC-e (quando existirem).

Empresa vê só as dela; Contador/Admin veem todas.

---

## 8. Health

- `GET /health` (público, sem segredos): `ok` / `degraded` / `down` + checks
- Painel: mesmo conteúdo + última conversa SEFAZ (quando houver) + validade do certificado por empresa

---

## 9. Usuários (Admin)

- Criar usuário: papel ADMIN | CONTADOR | EMPRESA
- Se EMPRESA: vincular a uma ou mais empresas
- CONTADOR: sem vínculo obrigatório (acesso global)

---

## Fluxo Contador (repetível por empresa)

1. Abrir/criar empresa → dados cadastrais  
2. Upload certificado A1  
3. Preencher regras fiscais mínimas  
4. Emitir NF teste em homologação (quando motor existir)  
5. Marcar “Homologação OK”  
6. Pedir ao Admin liberar Produção  

Engenharia não espera o passo 3 para subir API, filas e telas.
