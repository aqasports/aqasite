@echo off
cd /d "%~dp0"
echo Running git automation script...
echo.
C:\Users\dell\AppData\Local\Programs\Python\Python313\python.exe auto_git.py
if %errorlevel% neq 0 (
    echo.
    echo ERROR: auto_git.py failed with exit code %errorlevel%
)
echo.
pause
