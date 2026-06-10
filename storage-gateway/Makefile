-include .env
-include .env.test

.PHONY: start deploy clean test
.IGNORE: deploy deploy-dev deploy-prod

comment ?= update

define setup_env
	$(eval ENV_FILE := $(1))
	@echo " - setup env $(ENV_FILE)"
	$(eval include $(1))
	$(eval export sed 's/=.*//' $(1))
endef

test:
	$(call setup_env,.env)
	echo "test $(CONTAINER_NETWORK)" 

test-dev:
	$(call setup_env,.env.dev)
	echo "test dev $(CONTAINER_NETWORK)" 


install-local:
	@echo "############################################"
	@echo "make file try to install dependencies..👌👌"
	npm i 
	npm run install-dependencies
	@echo "install dependencies donedone ✅✅"
	@echo "############################################"

# for push code to git
push-code:
	git add .
	git commit -m "$(comment)"
	git push

# check code before commit
pre-commit:
	npm run lint
	npm run build

# update code
update:
	git fetch
	git pull


# deploy app
deploy:
	$(call setup_env,.env)
	docker network create $(CONTAINER_NETWORK)
	docker compose -p laundry-local --env-file .env -f docker-compose.yml up -d --build

deploy-dev:
	$(call setup_env,.env.dev)
	docker network create $(CONTAINER_NETWORK)
	docker compose -p laundry-dev --env-file .env.dev -f docker-compose.dev.yml up -d --build

deploy-prod:
	$(call setup_env,.env.prod)
	docker network create $(CONTAINER_NETWORK)
	docker compose -p laundry-prod --env-file .env.prod -f docker-compose.prod.yml up -d --build

