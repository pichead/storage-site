# ========================================
# Build Stage
# ========================================
FROM node:22-alpine AS builder

# ติดตั้ง dependencies ที่จำเป็นสำหรับ build (รองรับ ARM64 / Raspberry Pi 5)
RUN apk add --no-cache libc6-compat python3 make g++

WORKDIR /app

# คัดลอก package files ก่อน (layer caching)
COPY package*.json ./
COPY prisma ./prisma/

# ติดตั้ง dependencies ทั้งหมด (รวม devDependencies สำหรับ build)
RUN npm ci && npm cache clean --force

# คัดลอก source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build NestJS
RUN npm run build

# ลบ devDependencies ออกหลัง build เสร็จ
RUN npm prune --production

# ========================================
# Production Stage
# ========================================
FROM node:22-alpine AS production

# ติดตั้ง dumb-init, yt-dlp, ffmpeg (ARM64 compatible)
RUN apk add --no-cache \
    dumb-init \
    ffmpeg \
    python3 \
    py3-pip \
    curl \
    && pip3 install --break-system-packages yt-dlp \
    && yt-dlp --version

# สร้าง non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

WORKDIR /app

# สร้าง temp_downloads และ logs directory พร้อมกำหนดสิทธิ์
RUN mkdir -p /app/temp_downloads /app/logs && chown -R nestjs:nodejs /app/temp_downloads /app/logs

# คัดลอกไฟล์จาก build stage
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/package*.json ./
COPY --from=builder --chown=nestjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nestjs:nodejs /app/generated ./generated

# entrypoint script สำหรับ run prisma migrate แล้วค่อย start app
COPY --chown=nestjs:nodejs docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

USER nestjs

EXPOSE 3333

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=5 \
  CMD curl -f http://localhost:3333/health || exit 1

ENTRYPOINT ["dumb-init", "--", "/app/docker-entrypoint.sh"]
