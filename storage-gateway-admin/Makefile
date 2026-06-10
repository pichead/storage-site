
.PHONY: start deploy clean test
.IGNORE: deploy deploy-dev deploy-prod

comment ?= update


# for push code to git
push:
	git add .
	git commit -m "$(comment)"
	git push

# update code
pull:
	git fetch
	git pull

