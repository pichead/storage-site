# ============================================================
# Makefile - Storage Site
# ============================================================
.PHONY: help up down build logs restart pull clean

# แสดงคำสั่งที่มีทั้งหมด
help:
	@echo "📦 Storage Site - Docker Commands"
	@echo "=================================="
	@echo "  make up          - เริ่มต้น services ทั้งหมด"
	@echo "  make up-tools    - เริ่มต้นพร้อม phpMyAdmin"
	@echo "  make down        - หยุด services ทั้งหมด"
	@echo "  make build       - build images ใหม่"
	@echo "  make logs        - ดู logs แบบ real-time"
	@echo "  make logs-api    - ดู logs เฉพาะ backend"
	@echo "  make logs-web    - ดู logs เฉพาะ frontend"
	@echo "  make restart     - restart services ทั้งหมด"
	@echo "  make pull        - ดึง image ล่าสุดจาก registry"
	@echo "  make clean       - ลบ volumes และ images ทั้งหมด (⚠️ ลบ DB ด้วย)"
	@echo "  make shell-api   - เข้า shell ของ backend container"
	@echo "  make migrate     - รัน prisma migrate ใน backend"

# เริ่มต้น services ทั้งหมด
up:
	docker compose up -d

# เริ่มต้นพร้อม phpMyAdmin
up-tools:
	docker compose --profile tools up -d

# หยุดทุก service
down:
	docker compose down

# Build images ใหม่ทั้งหมด
build:
	docker compose build --no-cache

# ดู logs ทั้งหมด
logs:
	docker compose logs -f

# ดู logs เฉพาะ backend
logs-api:
	docker compose logs -f backend

# ดู logs เฉพาะ frontend
logs-web:
	docker compose logs -f frontend

# ดู logs เฉพาะ mysql
logs-db:
	docker compose logs -f mysql

# Restart ทุก service
restart:
	docker compose restart

# Pull images ล่าสุด
pull:
	docker compose pull

# ลบทุกอย่าง (ระวัง! ลบ DB data ด้วย)
clean:
	@echo "⚠️  กำลังลบ volumes และ containers ทั้งหมด รวมถึงข้อมูล DB!"
	docker compose down -v --remove-orphans

# เข้า shell ของ backend
shell-api:
	docker compose exec backend sh

# เข้า shell ของ frontend
shell-web:
	docker compose exec frontend sh

# รัน prisma migrate ใน container
migrate:
	docker compose exec backend npx prisma migrate deploy

# ดูสถานะ services
status:
	docker compose ps

pull-deploy:
	git fetch
	git pull
	docker compose up -d --build
