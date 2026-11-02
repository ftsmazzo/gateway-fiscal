# Integração ERP → Gateway Fiscal

Base URL (EasyPanel): `https://gateway-fiscal-api.kxryyk.easypanel.host`

## Auth

```http
Authorization: Bearer <api_key>
```

## Emitir NF-e

```http
POST /v1/nfe
Content-Type: application/json

{
  "externalId": "pedido-123",
  "destinatario": {
    "nome": "Cliente Teste",
    "cpfCnpj": "12345678909",
    "uf": "SP"
  },
  "itens": [
    {
      "descricao": "Luva EPI",
      "ncm": "40151100",
      "cfop": "5102",
      "quantidade": 10,
      "valorUnitario": 15.9
    }
  ],
  "totais": { "valorNota": 159.0 }
}
```

Resposta `202`:

```json
{ "id": "...", "status": "na_fila", "sefazMode": "mock" }
```

## Consultar

```http
GET /v1/nfe/{id}
GET /v1/nfe/{id}/xml
```

Com `SEFAZ_MODE=mock`, o worker autoriza em segundos (homologação simulada).  
Quando o Contador preencher dados + certificado, trocamos para `SEFAZ_MODE=sefaz`.
