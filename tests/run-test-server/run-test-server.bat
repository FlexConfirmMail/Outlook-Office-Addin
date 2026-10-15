@echo on

pushd ..\..
call build-web-server.bat
call build.bat
popd
xcopy /y ..\..\local-web-server .
rmdir /s /q .\web
xcopy /y /s ..\..\dist .\web\
xcopy /y .\configs .\web\configs\
xcopy /y .\custom-locales .\web\custom-locales\
xcopy /y .\custom-css .\web\custom-css\
echo start web server: https://127.0.0.1:10041
https_server.exe --root .\web