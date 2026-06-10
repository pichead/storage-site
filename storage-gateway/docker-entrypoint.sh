#!/bin/sh
set -e

echo "🚀 Starting Storage Gateway..."
echo "📦 Running Prisma migrations..."

# รัน Prisma migrate deploy (safe สำหรับ production)
npx prisma migrate deploy

echo "✅ Migrations complete. Starting application..."
exec node dist/src/main.js
