.PHONY: build up down status logs smoke config

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

config:
	docker compose config --quiet
