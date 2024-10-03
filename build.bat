@echo on

git submodule update --init --recursive
call npm install 
call npx webpack
