@echo off
echo Starting GitHub Automation...
:: Change directory to where this script file is located
cd /d "%~dp0"

:: Run the Python script
python auto_git.py

:: Keep the window open so you can see the result (Success or Error)
pause