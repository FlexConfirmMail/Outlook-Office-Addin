@echo on

call build-and-import-keys.bat
mkdir local-web-server
pushd local-web-server
  go build ..\src\tools\https_server\https_server.go
  xcopy ..\local-web-server-keys .
popd