-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'CONTADOR', 'EMPRESA');

-- CreateEnum
CREATE TYPE "Ambiente" AS ENUM ('homologacao', 'producao');

-- CreateEnum
CREATE TYPE "DocStatus" AS ENUM ('rascunho', 'na_fila', 'processando', 'autorizada', 'rejeitada', 'cancelada');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "razaoSocial" TEXT NOT NULL,
    "nomeFantasia" TEXT,
    "cnpj" TEXT NOT NULL,
    "ie" TEXT,
    "im" TEXT,
    "regime" TEXT,
    "emailFiscal" TEXT,
    "telefone" TEXT,
    "cep" TEXT,
    "logradouro" TEXT,
    "numero" TEXT,
    "complemento" TEXT,
    "bairro" TEXT,
    "municipio" TEXT,
    "uf" TEXT,
    "codigoIbge" TEXT,
    "serieNfe" INTEGER NOT NULL DEFAULT 1,
    "proximoNumeroNfe" INTEGER NOT NULL DEFAULT 1,
    "ambiente" "Ambiente" NOT NULL DEFAULT 'homologacao',
    "producaoLiberada" BOOLEAN NOT NULL DEFAULT false,
    "homologacaoOk" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserCompany" (
    "userId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    CONSTRAINT "UserCompany_pkey" PRIMARY KEY ("userId","companyId")
);

CREATE TABLE "Certificate" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "fileEncrypted" BYTEA NOT NULL,
    "passwordEnc" TEXT NOT NULL,
    "subject" TEXT,
    "cnpjCert" TEXT,
    "validFrom" TIMESTAMP(3),
    "validTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Certificate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FiscalRule" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "grupoProduto" TEXT NOT NULL,
    "ncm" TEXT NOT NULL,
    "cfopDentro" TEXT,
    "cfopFora" TEXT,
    "cstOuCsosn" TEXT,
    "pisAliquota" DECIMAL(7,4),
    "cofinsAliquota" DECIMAL(7,4),
    "icmsAliquota" DECIMAL(7,4),
    "naturezaOperacao" TEXT,
    "infosComplementares" TEXT,
    "revisado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FiscalRule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "ambiente" "Ambiente" NOT NULL DEFAULT 'homologacao',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "externalId" TEXT,
    "status" "DocStatus" NOT NULL DEFAULT 'rascunho',
    "serie" INTEGER,
    "numero" INTEGER,
    "chaveAcesso" TEXT,
    "protocolo" TEXT,
    "rejectionCode" TEXT,
    "rejectionMsg" TEXT,
    "payloadJson" JSONB,
    "xmlStorage" TEXT,
    "danfeStorage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "Company_cnpj_key" ON "Company"("cnpj");
CREATE UNIQUE INDEX "Certificate_companyId_key" ON "Certificate"("companyId");
CREATE UNIQUE INDEX "ApiKey_keyHash_key" ON "ApiKey"("keyHash");
CREATE INDEX "FiscalRule_companyId_idx" ON "FiscalRule"("companyId");
CREATE INDEX "ApiKey_companyId_idx" ON "ApiKey"("companyId");
CREATE INDEX "Document_companyId_status_idx" ON "Document"("companyId", "status");
CREATE INDEX "Document_externalId_idx" ON "Document"("externalId");

ALTER TABLE "UserCompany" ADD CONSTRAINT "UserCompany_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserCompany" ADD CONSTRAINT "UserCompany_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FiscalRule" ADD CONSTRAINT "FiscalRule_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Document" ADD CONSTRAINT "Document_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
