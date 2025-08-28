@echo off
setlocal EnableDelayedExpansion

echo.
echo Health Guard User Cleanup Tool
echo ==============================
echo.

set "WORKSPACE_ROOT=%~dp0.."
set "LOAD_TEST_DIR=%WORKSPACE_ROOT%\load-testing"

echo Working Directory: %WORKSPACE_ROOT%
echo Load Test Directory: %LOAD_TEST_DIR%
echo.

echo Checking environment...

node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found
    pause
    exit /b 1
)

if not exist "%LOAD_TEST_DIR%" (
    echo [ERROR] load-testing directory not found
    pause
    exit /b 1
)

cd /d "%LOAD_TEST_DIR%"

if not exist "node_modules" (
    echo Installing dependencies...
    call npm install --silent
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install dependencies
        pause
        exit /b 1
    )
)

echo Checking database connection...
node src\database-test.js >nul 2>&1
if %errorlevel% equ 0 (
    echo [SUCCESS] Database is connected
    set "DATABASE_AVAILABLE=true"
) else (
    echo [WARNING] Database not available
    set "DATABASE_AVAILABLE=false"
)

:MAIN_MENU
echo.
echo User Cleanup Options:
echo [1] Delete All Test Users
echo [2] Delete Users by Date Range  
echo [3] Delete Specific User Count
echo [4] Preview Deletion
echo [0] Exit
echo.

set /p CHOICE=Select option (0-4): 

if "%CHOICE%"=="0" (
    echo Exiting...
    exit /b 0
)

if "%DATABASE_AVAILABLE%"=="false" (
    echo [ERROR] Database not available
    pause
    goto :MAIN_MENU
)

if "%CHOICE%"=="1" (
    echo.
    echo WARNING: This will delete ALL test users!
    set /p CONFIRM=Type DELETE to confirm: 
    if /i "!CONFIRM!" neq "DELETE" (
        echo Cancelled
        goto :MAIN_MENU
    )
    
    node src\userCleanupTool.js all
    pause
    goto :MAIN_MENU
)

if "%CHOICE%"=="2" (
    set /p START_DATE=Enter start date (YYYY-MM-DD): 
    set /p END_DATE=Enter end date (YYYY-MM-DD): 
    
    if "!START_DATE!"=="" (
        echo [ERROR] Start date required
        pause
        goto :MAIN_MENU
    )
    
    if "!END_DATE!"=="" (
        echo [ERROR] End date required
        pause
        goto :MAIN_MENU
    )
    
    node src\userCleanupTool.js date-range !START_DATE! !END_DATE!
    pause
    goto :MAIN_MENU
)

if "%CHOICE%"=="3" (
    set /p USER_COUNT=Enter number of users to delete: 
    
    if "!USER_COUNT!"=="" (
        echo [ERROR] User count required
        pause
        goto :MAIN_MENU
    )
    
    node src\userCleanupTool.js count !USER_COUNT!
    pause
    goto :MAIN_MENU
)

if "%CHOICE%"=="4" (
    node src\userCleanupTool.js preview
    pause
    goto :MAIN_MENU
)

echo [ERROR] Invalid selection
goto :MAIN_MENU
