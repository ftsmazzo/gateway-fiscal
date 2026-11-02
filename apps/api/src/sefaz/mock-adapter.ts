import { createHash } from "node:crypto";
import type { EmitInput, EmitResult, SefazAdapter } from "./types.js";

/**
 * Simula autorização SEFAZ em homologação.
 * Permite validar fila/API/ERP sem certificado nem dados reais do Contador.
 * Nunca use em produção (bloqueado aqui).
 */
export class MockSefazAdapter implements SefazAdapter {
  readonly name = "mock";

  async emit(input: EmitInput): Promise<EmitResult> {
    if (input.company.ambiente === "producao") {
      return {
        ok: false,
        code: "GF-MOCK-PROD",
        message: "Adapter mock não pode autorizar em produção.",
      };
    }

    const cnpj = (input.company.cnpj || "00000000000000").replace(/\D/g, "").padStart(14, "0").slice(0, 14);
    const aamm = new Date().toISOString().slice(2, 7).replace("-", "");
    const serie = String(input.company.serie).padStart(3, "0");
    const numero = String(input.company.numero).padStart(9, "0");
    // chave mock 43 dígitos + DV simplificado → 44
    const corpo = `35${aamm}${cnpj}55${serie}${numero}1`.replace(/\D/g, "").slice(0, 43).padEnd(43, "0");
    const dv = String(
      createHash("sha1")
        .update(corpo)
        .digest()
        .readUInt8(0) % 10,
    );
    const chave = `${corpo}${dv}`;
    const protocolo = `MOCK${Date.now()}`;

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
  <protNFe>
    <infProt>
      <tpAmb>2</tpAmb>
      <chNFe>${chave}</chNFe>
      <nProt>${protocolo}</nProt>
      <cStat>100</cStat>
      <xMotivo>Autorizado o uso da NF-e (MOCK)</xMotivo>
    </infProt>
  </protNFe>
  <!-- documentId=${input.documentId} company=${input.company.razaoSocial} -->
</nfeProc>`;

    return { ok: true, chaveAcesso: chave, protocolo, xml };
  }
}
