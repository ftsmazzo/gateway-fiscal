export type EmitInput = {
  documentId: string;
  company: {
    id: string;
    cnpj: string;
    razaoSocial: string;
    ie: string | null;
    uf: string | null;
    ambiente: "homologacao" | "producao";
    serie: number;
    numero: number;
  };
  payload: unknown;
  certificatePfx?: Buffer;
  certificatePassword?: string;
};

export type EmitResult =
  | {
      ok: true;
      chaveAcesso: string;
      protocolo: string;
      xml: string;
    }
  | {
      ok: false;
      code: string;
      message: string;
    };

export interface SefazAdapter {
  readonly name: string;
  emit(input: EmitInput): Promise<EmitResult>;
}
