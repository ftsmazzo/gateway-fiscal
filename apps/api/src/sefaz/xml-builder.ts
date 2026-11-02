/**
 * Esqueleto de montagem do XML NF-e 4.00.
 * Ainda NÃO assina nem valida XSD — próximo passo antes do WS SEFAZ.
 */

export type NfeBuildInput = {
  ide: {
    cUF: string;
    natOp: string;
    mod: "55";
    serie: number;
    nNF: number;
    dhEmi: string;
    tpNF: "1";
    idDest: "1" | "2";
    cMunFG: string;
    tpImp: "1";
    tpEmis: "1";
    tpAmb: "1" | "2";
    finNFe: "1";
    indFinal: "0" | "1";
    indPres: "9";
  };
  emit: {
    CNPJ: string;
    xNome: string;
    IE?: string;
    CRT: string;
    enderEmit: {
      xLgr: string;
      nro: string;
      xBairro: string;
      cMun: string;
      xMun: string;
      UF: string;
      CEP: string;
    };
  };
  dest: {
    CNPJ?: string;
    CPF?: string;
    xNome: string;
    indIEDest: string;
    IE?: string;
    enderDest?: {
      UF: string;
    };
  };
  itens: Array<{
    nItem: number;
    prod: {
      cProd: string;
      xProd: string;
      NCM: string;
      CFOP: string;
      uCom: string;
      qCom: string;
      vUnCom: string;
      vProd: string;
      uTrib: string;
      qTrib: string;
      vUnTrib: string;
      indTot: "1";
    };
  }>;
  total: {
    vProd: string;
    vNF: string;
  };
};

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Gera XML intermediário (sem assinatura). */
export function buildNfeXmlSkeleton(input: NfeBuildInput): string {
  const itensXml = input.itens
    .map(
      (item) => `
    <det nItem="${item.nItem}">
      <prod>
        <cProd>${esc(item.prod.cProd)}</cProd>
        <xProd>${esc(item.prod.xProd)}</xProd>
        <NCM>${esc(item.prod.NCM)}</NCM>
        <CFOP>${esc(item.prod.CFOP)}</CFOP>
        <uCom>${esc(item.prod.uCom)}</uCom>
        <qCom>${esc(item.prod.qCom)}</qCom>
        <vUnCom>${esc(item.prod.vUnCom)}</vUnCom>
        <vProd>${esc(item.prod.vProd)}</vProd>
        <uTrib>${esc(item.prod.uTrib)}</uTrib>
        <qTrib>${esc(item.prod.qTrib)}</qTrib>
        <vUnTrib>${esc(item.prod.vUnTrib)}</vUnTrib>
        <indTot>${item.prod.indTot}</indTot>
      </prod>
      <imposto><!-- ICMS/PIS/COFINS: preencher na fase SEFAZ --></imposto>
    </det>`,
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<NFe xmlns="http://www.portalfiscal.inf.br/nfe">
  <infNFe versao="4.00">
    <ide>
      <cUF>${esc(input.ide.cUF)}</cUF>
      <natOp>${esc(input.ide.natOp)}</natOp>
      <mod>${input.ide.mod}</mod>
      <serie>${input.ide.serie}</serie>
      <nNF>${input.ide.nNF}</nNF>
      <dhEmi>${esc(input.ide.dhEmi)}</dhEmi>
      <tpNF>${input.ide.tpNF}</tpNF>
      <idDest>${input.ide.idDest}</idDest>
      <cMunFG>${esc(input.ide.cMunFG)}</cMunFG>
      <tpImp>${input.ide.tpImp}</tpImp>
      <tpEmis>${input.ide.tpEmis}</tpEmis>
      <tpAmb>${input.ide.tpAmb}</tpAmb>
      <finNFe>${input.ide.finNFe}</finNFe>
      <indFinal>${input.ide.indFinal}</indFinal>
      <indPres>${input.ide.indPres}</indPres>
    </ide>
    <emit>
      <CNPJ>${esc(input.emit.CNPJ)}</CNPJ>
      <xNome>${esc(input.emit.xNome)}</xNome>
      ${input.emit.IE ? `<IE>${esc(input.emit.IE)}</IE>` : ""}
      <CRT>${esc(input.emit.CRT)}</CRT>
      <enderEmit>
        <xLgr>${esc(input.emit.enderEmit.xLgr)}</xLgr>
        <nro>${esc(input.emit.enderEmit.nro)}</nro>
        <xBairro>${esc(input.emit.enderEmit.xBairro)}</xBairro>
        <cMun>${esc(input.emit.enderEmit.cMun)}</cMun>
        <xMun>${esc(input.emit.enderEmit.xMun)}</xMun>
        <UF>${esc(input.emit.enderEmit.UF)}</UF>
        <CEP>${esc(input.emit.enderEmit.CEP)}</CEP>
      </enderEmit>
    </emit>
    <dest>
      ${input.dest.CNPJ ? `<CNPJ>${esc(input.dest.CNPJ)}</CNPJ>` : ""}
      ${input.dest.CPF ? `<CPF>${esc(input.dest.CPF)}</CPF>` : ""}
      <xNome>${esc(input.dest.xNome)}</xNome>
      <indIEDest>${esc(input.dest.indIEDest)}</indIEDest>
      ${input.dest.IE ? `<IE>${esc(input.dest.IE)}</IE>` : ""}
    </dest>
    ${itensXml}
    <total>
      <ICMSTot>
        <vProd>${esc(input.total.vProd)}</vProd>
        <vNF>${esc(input.total.vNF)}</vNF>
      </ICMSTot>
    </total>
  </infNFe>
</NFe>`;
}
