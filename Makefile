.PHONY: build prepare-images up down status logs smoke test-p0-2 test-p0-2b test-p0-2c test-unit test config

build:
	docker compose build

prepare-images:
	docker build --build-arg APP_VERSION=v2.0.0 --tag mini-paas/app-a:v2.0.0 ./apps/app-a

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

test-unit:
	cd platform/runner && npm test
	cd platform/control-api && npm test
	cd platform/dashboard && npm run build

test: test-unit smoke test-p0-2 test-p0-2b test-p0-2c

config:
	docker compose config --quiet
