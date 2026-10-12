COMMIT_SHA ?= $(shell git rev-parse HEAD)
CI_OUTPUT_DIR ?= output/ci
K6_IMAGE ?= grafana/k6:2.3.0@sha256:9c2dee7f8ed74d317e4027c06a10f169b625638189de8d4555d0b3486a5aeb34

.PHONY: build prepare-images build-commit-images verify-commit-images up down status logs smoke test-p0-2 test-p0-2b test-p0-2c test-p1-1a test-p1-git test-p1-observability test-p1-dashboard test-p1-load-pilot test-p1-load test-unit test-integration test config

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

test-p1-git:
	./tests/integration/p1_git_deploy.sh "$(COMMIT_SHA)"

test-p1-observability:
	./tests/integration/p1_observability.sh

test-p1-dashboard:
	./tests/integration/p1_dashboard_navigation.sh

test-p1-load-pilot:
	K6_IMAGE="$(K6_IMAGE)" ./scripts/performance/run-t06.sh pilot

test-p1-load:
	K6_IMAGE="$(K6_IMAGE)" ./scripts/performance/run-t06.sh standard

test-unit:
	cd platform/runner && npm test
	cd platform/control-api && npm test
	cd platform/dashboard && npm run build

test-integration: smoke test-p0-2 test-p0-2b test-p0-2c test-p1-observability test-p1-dashboard

test: test-unit test-integration

config:
	docker compose config --quiet
