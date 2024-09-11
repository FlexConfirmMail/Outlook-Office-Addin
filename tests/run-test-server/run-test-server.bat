@echo on

pushd ..\..
call build-web-server.bat
call build.bat
popd
xcopy /y ..\..\local-web-server .
rmdir /s /q .\web
xcopy /y ..\..\dist .\web\
xcopy /y .\configs .\web\configs\
https_server.exe --root .\web