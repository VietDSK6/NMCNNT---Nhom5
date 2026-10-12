COMMIT_SHA ?= $(shell git rev-parse HEAD)
CI_OUTPUT_DIR ?= output/ci

.PHONY: build prepare-images build-commit-images verify-commit-images up down status logs smoke test-p0-2 test-p0-2b test-p0-2c test-p1-1a test-unit test-integration test config

build:
	docker compose build

prepare-images:
	docker build --build-arg APP_VERSION=v2.0.0 --tag mini-paas/app-a:v2.0.0 ./apps/app-a

build-commit-images:
	./scripts/ci/build-commit-images.sh "$(COMMIT_SHA)" "$(CI_OUTPUT_DIR)"

verify-commit-images:
	node ./scripts/ci/verify-image-manifest.mjs "$(CI_OUTPUT_DIR)/image-manifest.json" "$(COMMIT_SHA)"

up: build prepare-images
	docker compose up -d --wait

down:
	docker compose down

status:
	docker compose ps

logs:
	docker compose logs --tail=100

smoke:
	./tests/smoke/p0_1.sh

test-p0-2:
	./tests/integration/p0_2.sh

test-p0-2b:
	./tests/integration/p0_2b.sh

test-p0-2c:
	./tests/integration/p0_2c.sh

test-p1-1a:
	./tests/ci/p1_1a.sh "$(COMMIT_SHA)" "$(CI_OUTPUT_DIR)"

test-unit:
	cd platform/runner && npm test
	cd platform/control-api && npm test
	cd platform/dashboard && npm run build

test-integration: smoke test-p0-2 test-p0-2b test-p0-2c

test: test-unit test-integration

config:
	docker compose config --quiet
