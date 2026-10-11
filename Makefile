.PHONY: build up down status logs smoke test-p0-2 test config

build:
	docker compose build

up:
	docker compose up --build --wait

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

test: smoke test-p0-2

config:
	docker compose config --quiet
