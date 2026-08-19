FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts

# Run only the repository-owned compatibility patch required by the frontend build.
COPY scripts ./scripts
RUN node scripts/fix-framer-motion.cjs

COPY . .
RUN npm run build

FROM node:22-alpine AS runner

WORKDIR /app

# FFmpeg is required at runtime for video assembly and rendering.
RUN apk add --no-cache ffmpeg

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 appuser

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

COPY --from=builder /app/dist ./dist

RUN mkdir -p storage/images uploads && chown -R appuser:nodejs /app

USER appuser

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

CMD ["node", "dist/server.cjs"]
