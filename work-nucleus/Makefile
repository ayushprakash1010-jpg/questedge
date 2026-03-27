.PHONY: dev build down prisma-migrate prisma-studio test-backend test-ai lint

# Start all services in dev mode
dev:
	cd infra && docker compose up --build

# Build all services
build:
	cd infra && docker compose build

# Stop all services
down:
	cd infra && docker compose down

# Run Prisma migration (requires running postgres)
prisma-migrate:
	cd backend && npx prisma migrate dev

# Open Prisma Studio
prisma-studio:
	cd backend && npx prisma studio

# Run backend tests
test-backend:
	cd backend && npm test

# Run AI service tests
test-ai:
	cd ai-service && python -m pytest

# Lint all services
lint:
	cd backend && npm run lint
	cd frontend && npm run lint
	cd support-admin && npm run lint

# Start only infrastructure (postgres + redis)
infra:
	cd infra && docker compose up postgres redis -d

# Generate Prisma client
prisma-generate:
	cd backend && npx prisma generate
