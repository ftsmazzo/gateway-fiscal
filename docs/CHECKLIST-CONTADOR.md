# Checklist do Contador (Daniel)

Preencher **no painel** do Gateway Fiscal (`/admin`), para **cada empresa**. Não depende do ERP.

## 1. Empresa
- [ ] Razão social, fantasia
- [ ] CNPJ, IE, regime tributário
- [ ] Endereço completo + UF + município + código IBGE
- [ ] E-mail / telefone fiscal
- [ ] Série NF-e e próximo número

## 2. Certificado
- [ ] Upload A1 (`.pfx`) + senha
- [ ] Conferir validade (&gt; 30 dias)

## 3. Regras fiscais (EPI)
- [ ] Por grupo/produto: NCM, CFOP dentro/fora UF, CST/CSOSN
- [ ] Natureza da operação padrão
- [ ] Infos complementares (se houver)
- [ ] Marcar regras como **Revisado**

## 4. Homologação
- [ ] Ambiente = Homologação
- [ ] Emitir NF teste (via ERP ou API) até autorizar na SEFAZ real (quando motor sair do mock)
- [ ] Marcar **Homologação OK**

## 5. Produção (só com Admin)
- [ ] Pedir ao Admin: liberar produção + ambiente Produção
- [ ] Nova API Key de produção para o ERP

## Enquanto isso
Engenharia usa empresa **demo** + `SEFAZ_MODE=mock` para integrar o ProntoEPI.
