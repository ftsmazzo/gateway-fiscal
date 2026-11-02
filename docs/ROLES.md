# Papéis e acesso

## Humanos (painel)

| Papel | Escopo | Pode |
|-------|--------|------|
| **ADMIN** | Plataforma | Criar empresas, usuários, API keys, liberar Produção, health, logs |
| **CONTADOR** | **Todas as empresas** (sócio) | Cadastro fiscal, certificado A1, regras NCM/CFOP/CST, validar homologação, repetir o fluxo em qualquer CNPJ |
| **EMPRESA** | Só a(s) empresa(s) vinculada(s) | Ver notas, baixar XML/DANFE, acompanhar rejeições — **não** altera regras fiscais |

O Contador **não** fica preso a uma empresa. Ele repete o mesmo processo (dados → certificado → regras → homologação) para cada CNPJ novo.

## Máquinas (API)

| Canal | Auth | Escopo |
|-------|------|--------|
| **Cliente API (ERP)** | `Authorization: Bearer <api_key>` | Emitir/consultar/cancelar **da empresa da key** |

API Key ≠ login do Contador. O ERP nunca sobe certificado nem edita CST/CFOP.

## Anti-travamento

| Trilha | Quem | Independente de |
|--------|------|-----------------|
| Plataforma (telas, auth, health, fila) | Engenharia | Planilha/dados do contador |
| Motor SEFAZ | Engenharia | Cadastro completo em produção |
| Dados fiscais em tela | Contador | Deploy do ERP consumidor |

**Produção** só libera com: Health verde + Contador OK na empresa + Admin libera ambiente Produção.
