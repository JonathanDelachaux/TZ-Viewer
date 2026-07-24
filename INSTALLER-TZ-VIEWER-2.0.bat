@echo off
chcp 65001 >nul
set "DEST=E:\GitHub\TZ-Viewer"
set "SRC=%~dp0projet"

echo.
echo Installation de TZ Viewer 2.0 dans :
echo %DEST%
echo.

if not exist "%DEST%\.git" (
  echo ERREUR : le depot Git attendu n'existe pas ici :
  echo %DEST%
  echo.
  pause
  exit /b 1
)

if not exist "%SRC%\app.js" (
  echo ERREUR : les fichiers du projet sont introuvables.
  pause
  exit /b 1
)

xcopy "%SRC%\*" "%DEST%\" /E /I /Y

echo TZ Viewer 2.0 - installation du 24 juillet 2026 > "%DEST%\VERSION-TZ-VIEWER.txt"

echo.
echo Installation terminee.
echo Retourne maintenant dans GitHub Desktop.
echo Tu dois voir plusieurs fichiers modifies et nouveaux.
echo.
pause
