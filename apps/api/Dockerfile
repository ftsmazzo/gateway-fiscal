# Build context = raiz do repositório
FROM node:22-alpine AS deps
WORKDIR /app
COPY apps/api/package.json apps/api/package-lock.json* ./
COPY apps/api/prisma ./prisma
RUN npm install

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY apps/api/ ./
RUN npx prisma generate && npm run build && mkdir -p dist/views && cp -r src/views/* dist/views/

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
EXPOSE 3080
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
