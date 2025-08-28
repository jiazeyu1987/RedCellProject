@echo off
setlocal EnableDelayedExpansion

:: 健康守护系统 - 快速压力测试工具
:: ===============================

echo.
echo ===============================
echo Health Guard Quick Load Test
echo ===============================
echo.

:: 设置目录
set "WORKSPACE_ROOT=%~dp0.."
set "LOAD_TEST_DIR=%WORKSPACE_ROOT%\load-testing"
set "SERVER_DIR=%WORKSPACE_ROOT%\server"

echo Working Directory: %WORKSPACE_ROOT%
echo Load Test Directory: %LOAD_TEST_DIR%
echo.

:: 检查基本环境
echo Checking environment...

:: 检查 Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found
    echo Please install Node.js 14+ version
    pause
    exit /b 1
)

:: 检查目录
if not exist "%LOAD_TEST_DIR%" (
    echo [ERROR] load-testing directory not found
    echo Please run from correct project directory
    pause
    exit /b 1
)

:: 进入测试目录
cd /d "%LOAD_TEST_DIR%"

:: 检查依赖
if not exist "node_modules" (
    echo [WARNING] Dependencies not installed
    echo Installing dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install dependencies
        echo Please run: tools\fix-load-test.bat
        pause
        exit /b 1
    )
)

:: 创建环境文件
if not exist ".env" (
    echo Creating .env file...
    echo # Health Guard Load Testing Environment > ".env"
    echo API_BASE_URL=http://localhost:3000/v1 >> ".env"
    echo DB_HOST=localhost >> ".env"
    echo DB_PORT=3306 >> ".env"
    echo DB_USERNAME=root >> ".env"
    echo DB_PASSWORD=abcd1234! >> ".env"
    echo DB_DATABASE=health_guard_db >> ".env"
    echo TEST_BATCH_SIZE=10 >> ".env"
    echo ENABLE_DATABASE_INSERT=true >> ".env"
)

:: 检查服务器
echo Checking server status...
curl -s http://localhost:3000/v1/config/health >nul 2>&1
if %errorlevel% equ 0 (
    echo [SUCCESS] Server is running
    set "SERVER_AVAILABLE=true"
) else (
    echo [WARNING] Server not running
    echo Start server: cd server ^&^& npm start
    set "SERVER_AVAILABLE=false"
)

:MAIN_MENU
echo.
echo ==================
echo  Quick Test Options
echo ==================
echo.
echo   [1] Generate Test Users (50 users)
echo   [2] Run Load Test (5 minutes)
echo   [3] Run Stress Test (3 minutes)
echo.
echo   [9] Troubleshooting
echo   [0] Exit

if "%SERVER_AVAILABLE%"=="false" (
    echo.
    echo [WARNING] Server not running - some tests may fail
)

echo.
set /p CHOICE=Select option 

if "%CHOICE%"=="0" (
    echo Exiting quick load test tool
    pause
    exit /b 0
)

if "%CHOICE%"=="1" (
    echo.
    echo [USER GEN] Generating 50 test users...
    echo This will create virtual users in the database
    echo.
    
    set /p CONFIRM=Confirm generate test users y/N 
    if /i "!CONFIRM!" neq "y" (
        echo User generation cancelled
        goto :MAIN_MENU
    )
    
    echo Generating 50 users with Chinese names...
    node generate-50-users.js
    
    if !errorlevel! equ 0 (
        echo [SUCCESS] 50 test users generated successfully!
    ) else (
        echo [ERROR] User generation failed
        echo Please check database connection and ensure MySQL server is running
    )
    
    pause
    goto :MAIN_MENU
)

if "%CHOICE%"=="2" (
    echo.
    echo [LOAD TEST] Starting 5-minute load test...
    echo This will simulate normal user load
    echo Press Ctrl+C to stop early
    echo.
    
    if exist "config\test-config.yml" (
        call npm run load-test
    ) else (
        echo [WARNING] Config file missing, using artillery directly
        echo Creating simple test config...
        echo config: > "quick-test.yml"
        echo   target: 'http://localhost:3000' >> "quick-test.yml"
        echo   phases: >> "quick-test.yml"
        echo     - duration: 300 >> "quick-test.yml"
        echo       arrivalRate: 5 >> "quick-test.yml"
        echo scenarios: >> "quick-test.yml"
        echo   - name: "Health Check" >> "quick-test.yml"
        echo     flow: >> "quick-test.yml"
        echo       - get: >> "quick-test.yml"
        echo           url: "/v1/config/health" >> "quick-test.yml"
        
        call npx artillery run quick-test.yml
    )
    
    echo Load test completed
    pause
    goto :MAIN_MENU
)

if "%CHOICE%"=="3" (
    echo.
    echo [STRESS TEST] Starting 3-minute stress test...
    echo This will put high load on the server
    echo WARNING: High intensity test
    echo.
    
    set /p CONFIRM=Confirm start stress test y/N 
    if /i "!CONFIRM!" neq "y" (
        echo Stress test cancelled
        goto :MAIN_MENU
    )
    
    if exist "config\stress-test.yml" (
        call npm run stress-test
    ) else (
        echo [WARNING] Config file missing, using artillery directly
        echo Creating stress test config...
        echo config: > "quick-stress.yml"
        echo   target: 'http://localhost:3000' >> "quick-stress.yml"
        echo   phases: >> "quick-stress.yml"
        echo     - duration: 60 >> "quick-stress.yml"
        echo       arrivalRate: 2 >> "quick-stress.yml"
        echo     - duration: 120 >> "quick-stress.yml"
        echo       arrivalRate: 10 >> "quick-stress.yml"
        echo     - duration: 60 >> "quick-stress.yml"
        echo       arrivalRate: 5 >> "quick-stress.yml"
        echo scenarios: >> "quick-stress.yml"
        echo   - name: "Stress Test" >> "quick-stress.yml"
        echo     flow: >> "quick-stress.yml"
        echo       - get: >> "quick-stress.yml"
        echo           url: "/v1/config/health" >> "quick-stress.yml"
        
        call npx artillery run quick-stress.yml
    )
    
    echo Stress test completed
    pause
    goto :MAIN_MENU
)

if "%CHOICE%"=="9" (
    echo.
    echo [TROUBLESHOOTING] Running basic troubleshooting...
    echo.
    
    echo [CHECK 1] Testing database connection...
    node test-database.js
    
    echo.
    echo [CHECK 2] Verifying test users...
    node verify-users.js
    
    echo.
    echo [INFO] For more troubleshooting options, use:
    echo tools\admin-tools.bat
    
    pause
    goto :MAIN_MENU
)

echo [ERROR] Invalid selection
goto :MAIN_MENU