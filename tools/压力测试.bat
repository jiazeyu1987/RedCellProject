@echo off
setlocal EnableDelayedExpansion

:: 健康守护系统 - 用户生成工具
:: ===============================

echo.
echo ===============================
echo Health Guard User Generation Tool
echo ===============================
echo.

:: 设置目录
set "WORKSPACE_ROOT=%~dp0.."
set "LOAD_TEST_DIR=%WORKSPACE_ROOT%\load-testing"

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
        pause
        exit /b 1
    )
)

:: 创建环境文件
if not exist ".env" (
    echo Creating .env file...
    (
        echo # Health Guard Load Testing Environment
        echo API_BASE_URL=http://localhost:3000/v1
        echo DB_HOST=localhost
        echo DB_PORT=3306
        echo DB_USERNAME=root
        echo DB_PASSWORD=abcd1234!
        echo DB_DATABASE=health_guard_db
        echo TEST_BATCH_SIZE=10
        echo ENABLE_DATABASE_INSERT=true
    ) > ".env"
)

:: 检查数据库连接
echo Checking database connection...
node -e "const mysql = require('mysql2/promise'); async function test() { try { const conn = await mysql.createConnection({ host: 'localhost', user: 'root', password: 'abcd1234!', database: 'health_guard_db' }); await conn.end(); console.log('DB_OK'); } catch (e) { console.log('DB_ERROR'); } } test();" > db_check.txt 2>&1
findstr "DB_OK" db_check.txt >nul 2>&1
if %errorlevel% equ 0 (
    echo [SUCCESS] Database is connected
    set "DATABASE_AVAILABLE=true"
) else (
    echo [WARNING] Database not available
    echo Please check MySQL server and configuration
    echo Common solutions:
    echo   1. Start MySQL service: net start mysql
    echo   2. Check if MySQL is installed
    echo   3. Verify connection settings in server\.env file
    set "DATABASE_AVAILABLE=false"
)
del db_check.txt >nul 2>&1

:: 统计现有测试用户
echo.
echo Scanning test users...
if exist "%LOAD_TEST_DIR%\check-test-users.js" (
    node check-test-users.js 2>nul
) else (
    echo Test Users: Check script not found
)

echo.
echo ==================
echo Generate 100 Random Users
echo ==================
echo.

if "%DATABASE_AVAILABLE%"=="false" (
    echo [ERROR] Database not available - cannot generate users
    echo Please ensure MySQL server is running and configured correctly
    echo.
    echo Press any key to exit...
    pause >nul
    exit /b 1
)

echo This will create 100 enhanced test users including:
echo   - User profiles with Chinese names and realistic data
echo   - Subscription records with various packages
echo   - Payment history with different methods
echo   - Address information across Beijing districts
echo   - Health data based on user conditions
echo.

set /p CONFIRM=Confirm generate 100 users (y/N) 
if /i "!CONFIRM!" neq "y" (
    echo User generation cancelled
    echo Press any key to exit...
    pause >nul
    exit /b 0
)

echo.
echo [USER GENERATION] Starting generation of 100 enhanced test users...
echo Please wait, this may take a few minutes...
echo.

node src\integratedUserGenerator.js generate 100

if %errorlevel% equ 0 (
    echo.
    echo [SUCCESS] 100 enhanced test users generated successfully!
    echo.
    echo Summary:
    echo - Total users: 100
    echo - User profiles: Created with Chinese names
    echo - Subscriptions: Assigned various packages
    echo - Payment records: Generated with different methods
    echo - Health data: Created based on user conditions
    echo - Addresses: Distributed across Beijing districts
    echo.
) else (
    echo.
    echo [ERROR] User generation failed
    echo Please check:
    echo 1. Database connection is stable
    echo 2. All required tables exist
    echo 3. Database user has sufficient permissions
    echo.
)

echo Press any key to exit...
pause >nul