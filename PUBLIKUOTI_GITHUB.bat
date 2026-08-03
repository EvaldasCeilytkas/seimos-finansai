@echo off
title Family Finance - Publish to GitHub

echo.
echo ===============================
echo   Publishing to GitHub...
echo ===============================
echo.

git add .
git commit -m "Update"

if errorlevel 1 (
    echo.
    echo No changes to commit or commit failed.
)

git push

echo.
echo ===============================
echo Finished!
echo If GitHub Actions is enabled,
echo your GitHub Pages site will update automatically.
echo ===============================
echo.
pause
