@echo on

mkdir local-web-server-keys
pushd local-web-server-keys
  if exist "cert.pem" (
    echo keys already exits
    popd
    goto end 
  )
  go run ..\src\tools\generate_cert\generate_cert.go --host 127.0.0.1
  copy cert.pem cert.crt
  certutil -addstore ROOT cert.crt
popd

:end
