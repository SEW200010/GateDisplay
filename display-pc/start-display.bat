@echo off
REM ============================================================
REM  Gate display - opens the display page full screen (kiosk)
REM  Put a shortcut to this file in the Startup folder
REM  (Windows + R  ->  shell:startup) so it opens at every boot.
REM ============================================================

REM Change this to the IP of the computer that runs the backend
set SERVER=http://10.75.25.252:5000

set CHROME="C:\Program Files\Google\Chrome\Application\chrome.exe"
if not exist %CHROME% set CHROME="C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"

REM Screen never switches off, computer never sleeps (when on power)
powercfg /change monitor-timeout-ac 0
powercfg /change standby-timeout-ac 0

REM Wait 20 seconds so the network is ready after boot
timeout /t 20 /nobreak >nul

REM Separate Chrome profile, so the display does not touch your normal Chrome
start "" %CHROME% --kiosk --noerrdialogs --disable-infobars --disable-session-crashed-bubble --disable-translate --no-first-run --autoplay-policy=no-user-gesture-required --user-data-dir="%LOCALAPPDATA%\GateDisplayChrome" %SERVER%
