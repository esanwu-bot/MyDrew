.PHONY: dev dev-full infra infra-down server server-test server-build py-server py-test py-cli py-seed frontend build clean migrate lint seed gentest embedding help

# === Infrastructure ===
infra:
	docker compose up -d postgres qdrant

infra-full:
	docker compose up -d postgres qdrant embedding

infra-down:
	docker compose down

# === Go Backend ===
server:
	cd server && go run ./cmd/server

server-test:
	cd server && go test ./...

server-build:
	cd server && go build -o ../bin/drew-server ./cmd/server

# === Python Business Backend ===
py-server:
	cd src && uvicorn api.routes:app --reload --port 8000

py-test:
	cd src && python -m pytest core/ models/ -v || true

py-cli:
	python src/cli/drew.py $(ARGS)

py-seed:
	@for f in snapshots/*.yaml; do \
		echo "  Registering $$f"; \
		python src/cli/drew.py register "$$f"; \
		echo; \
	done

# === Static Frontend (dark theme) ===
frontend:
	@echo "Frontend files at: frontend/"
	@echo "Open frontend/index.html in browser or serve with:"
	@echo "  python -m http.server 3000 --directory frontend"

# === Full Stack ===
dev: infra server

dev-full: infra
	@echo "Starting Go server on :8080, Python API on :8000"
	@echo "Run 'make server' and 'make py-server' in separate terminals"

build: server-build

clean:
	rm -rf bin/
	rm -rf web/.next web/out
	rm -rf server/testdata/generated
	rm -rf data/

# === Database ===
migrate:
	docker compose exec -T postgres psql -U drew -d drew < server/migrations/001_init.sql

# === Seed Data ===
seed:
	@echo "Seeding official SOP snapshots..."
	@for f in server/testdata/seed/*.amd; do \
		echo "  Publishing $$f"; \
		curl -s -X POST http://localhost:8080/api/v1/snapshots \
			-H "Content-Type: application/json" \
			-d "{\"content\": $$(cat $$f | python3 -c 'import sys,json; print(json.dumps(sys.stdin.read()))')}"; \
		echo; \
	done

# === Test Data Generator ===
gentest:
	cd server && go run ./cmd/gentest -count 1000 -output ./testdata/generated

# === Lint ===
lint:
	cd server && golangci-lint run ./... || true
	cd src && ruff check . || true
	@echo "Lint complete"

# === Embedding Service (local dev) ===
embedding:
	cd embedding-service && python main.py

# === Help ===
help:
	@echo "Drew MyDrew — Make targets:"
	@echo "  infra        - Start PostgreSQL + Qdrant"
	@echo "  server       - Run Go backend (:8080)"
	@echo "  py-server    - Run Python business API (:8000)"
	@echo "  py-seed      - Seed YAML snapshots into Python store"
	@echo "  py-cli       - Run Drew CLI (use ARGS=\"...\")"
	@echo "  frontend     - Serve dark theme frontend"
	@echo "  embedding    - Run BGE-M3 embedding service (:8090)"
	@echo "  dev-full     - Start all infrastructure"
	@echo "  build        - Build all binaries"
	@echo "  clean        - Remove build artifacts"
