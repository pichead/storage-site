# ========================================
# Build Stage
# ========================================
FROM node:22-alpine AS builder

RUN apk add --no-cache libc6-compat

WORKDIR /app

COPY package*.json ./
RUN npm ci && npm cache clean --force

COPY . .

ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Build Next.js (standalone output สำหรับ production)
RUN npm run build

# ========================================
# Production Stage
# ========================================
FROM node:22-alpine AS production

RUN apk add --no-cache dumb-init curl

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

WORKDIR /app

# คัดลอก Next.js standalone output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV NODE_ENV=production

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:3000 || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
