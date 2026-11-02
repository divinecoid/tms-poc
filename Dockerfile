FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build
# Skrip operasional dibundel jadi satu file agar image runtime tidak perlu devDependencies.
RUN npx esbuild scripts/migrate.ts scripts/create-user.ts \
      --bundle --platform=node --format=cjs --outdir=/ops --out-extension:.js=.cjs \
      --external:pg-native --external:next --external:next/* --alias:@=./src

FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0 UPLOAD_DIR=/app/uploads
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
COPY --from=build --chown=node:node /app/drizzle ./drizzle
COPY --from=build --chown=node:node /ops ./ops
# Volume bernama yang dipasang di sini mewarisi kepemilikan node:node dari image.
RUN mkdir -p /app/uploads && chown node:node /app/uploads
USER node
EXPOSE 3000
VOLUME ["/app/uploads"]
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1
CMD ["sh", "-c", "node ops/migrate.cjs && exec node server.js"]
