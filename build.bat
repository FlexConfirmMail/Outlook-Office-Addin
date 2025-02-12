@echo on

call npm install 
call npm run build
call npm run build:fallback
