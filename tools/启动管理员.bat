@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

:: 健康守护系统管理工具集
echo.
echo ████████╗ ██████╗  ██████╗ ██╗     ███████╗
echo ╚══██╔══╝██╔═══██╗██╔═══██╗██║     ██╔════╝
echo    ██║   ██║   ██║██║   ██║██║     ███████╗
echo    ██║   ██║   ██║██║   ██║██║     ╚════██║
echo    ██║   ╚██████╔╝╚██████╔╝███████╗███████║
echo    ╚═╝    ╚═════╝  ╚═════╝ ╚══════╝╚══════╝
echo.
echo        🛠️  健康守护系统管理工具集 🛠️
echo.

:: 设置颜色
for /F %%a in ('echo prompt $E ^| cmd') do set "ESC=%%a"
set "GREEN=%ESC%[32m"
set "YELLOW=%ESC%[33m"
set "BLUE=%ESC%[34m"
set "CYAN=%ESC%[36m"
set "WHITE=%ESC%[37m"
set "RESET=%ESC%[0m"

set "WORKSPACE=%~dp0.."
cd /d "%WORKSPACE%"

echo %CYAN%📁 工作目录: %WORKSPACE%%RESET%
echo.

:MAIN_MENU
echo %CYAN%🛠️  管理工具选项:%RESET%
echo.
echo %WHITE%  【前端管理】%RESET%
echo %WHITE%  [1] 启动管理员门户%RESET%
echo %WHITE%  [2] 构建管理门户%RESET%
echo %WHITE%  [3] 管理门户测试%RESET%
echo.
echo %WHITE%  【后端管理】%RESET%
echo %WHITE%  [4] 启动服务器%RESET%
echo %WHITE%  [5] 重启服务器%RESET%
echo %WHITE%  [6] 服务器测试%RESET%
echo.
echo %WHITE%  【数据库管理】%RESET%
echo %WHITE%  [7] 数据库连接测试%RESET%
echo %WHITE%  [8] 数据库迁移%RESET%
echo %WHITE%  [9] 重置数据库表%RESET%
echo %WHITE%  [20] 数据库问题诊断%RESET%
echo.
echo %WHITE%  【API管理】%RESET%
echo %WHITE%  [10] API扫描%RESET%
echo %WHITE%  [11] API冲突检测%RESET%
echo %WHITE%  [12] 生成API文档%RESET%
echo.
echo %WHITE%  【系统监控】%RESET%
echo %WHITE%  [13] 系统诊断%RESET%
echo %WHITE%  [14] API监控%RESET%
echo %WHITE%  [15] 完整系统启动%RESET%
echo.
echo %WHITE%  【压力测试】%RESET%
echo %WHITE%  [16] 压力测试工具%RESET%
echo %WHITE%  [17] 快速负载测试%RESET%
echo %WHITE%  [18] 生成测试用户%RESET%
echo %WHITE%  [19] 压力测试故障排除%RESET%
echo.
echo %WHITE%  [0] 退出%RESET%
echo.

set /p CHOICE=请选择操作 (0-20): 

if "%CHOICE%"=="0" exit /b 0

if "%CHOICE%"=="1" (
    echo %GREEN%🚀 启动管理员门户...%RESET%
    cd admin-portal
    if not exist "node_modules" npm install
    start cmd /k "title=Admin Portal & npm start"
    goto :MAIN_MENU
)

if "%CHOICE%"=="2" (
    echo %BLUE%🔨 构建管理门户...%RESET%
    cd admin-portal
    npm run build
    if !errorlevel! equ 0 (
        echo %GREEN%✅ 构建成功%RESET%
    ) else (
        echo %YELLOW%❌ 构建失败%RESET%
    )
    pause
    goto :MAIN_MENU
)

if "%CHOICE%"=="3" (
    echo %BLUE%🧪 运行管理门户测试...%RESET%
    cd admin-portal
    npm test
    pause
    goto :MAIN_MENU
)

if "%CHOICE%"=="4" (
    echo %GREEN%🚀 启动服务器...%RESET%
    cd server
    if not exist "node_modules" npm install
    start cmd /k "title=Backend Server & npm start"
    goto :MAIN_MENU
)

if "%CHOICE%"=="5" (
    echo %YELLOW%🔄 重启服务器...%RESET%
    call restart-server.bat
    goto :MAIN_MENU
)

if "%CHOICE%"=="6" (
    echo %BLUE%🧪 运行服务器测试...%RESET%
    cd server
    npm test
    pause
    goto :MAIN_MENU
)

if "%CHOICE%"=="7" (
    echo %BLUE%🔍 测试数据库连接...%RESET%
    node test-db-connection.js
    pause
    goto :MAIN_MENU
)

if "%CHOICE%"=="8" (
    echo %BLUE%📊 执行数据库迁移...%RESET%
    call migrate-db.bat
    pause
    goto :MAIN_MENU
)

if "%CHOICE%"=="9" (
    echo %YELLOW%⚠️  重置数据库表...%RESET%
    set /p CONFIRM=确认重置所有表? (y/N): 
    if /i "!CONFIRM!"=="y" (
        node reset-tables.js
    ) else (
        echo 操作已取消
    )
    pause
    goto :MAIN_MENU
)

if "%CHOICE%"=="10" (
    echo %BLUE%🔍 扫描API接口...%RESET%
    node api-scanner.js
    pause
    goto :MAIN_MENU
)

if "%CHOICE%"=="11" (
    echo %BLUE%🔍 检测API冲突...%RESET%
    node conflict-detector.js
    pause
    goto :MAIN_MENU
)

if "%CHOICE%"=="12" (
    echo %BLUE%📝 生成API文档...%RESET%
    node doc-generator.js
    echo %GREEN%✅ 文档生成完成%RESET%
    pause
    goto :MAIN_MENU
)

if "%CHOICE%"=="13" (
    echo %BLUE%🔍 系统诊断...%RESET%
    node diagnose-errors.js
    pause
    goto :MAIN_MENU
)

if "%CHOICE%"=="14" (
    echo %BLUE%📊 API监控...%RESET%
    node api-monitor.js scan
    pause
    goto :MAIN_MENU
)

if "%CHOICE%"=="15" (
    echo %GREEN%🚀 启动完整系统...%RESET%
    call start-system.bat
    goto :MAIN_MENU
)

if "%CHOICE%"=="16" (
    echo %BLUE%🔥 启动压力测试工具...%RESET%
    call tools\load-test-ascii.bat
    goto :MAIN_MENU
)

if "%CHOICE%"=="17" (
    echo %BLUE%⚡ 快速负载测试...%RESET%
    call tools\quick-load-test.bat
    goto :MAIN_MENU
)

if "%CHOICE%"=="18" (
    echo %BLUE%👥 生成测试用户...%RESET%
    cd load-testing
    if not exist "node_modules" (
        echo 📦 安装依赖...
        call npm install
        echo ✅ 依赖安装完成
    )
    echo 🔄 生成100个测试用户...
    call node src/testRunner.js generate-users --count 100
    cd ..
    pause
    goto :MAIN_MENU
)

if "%CHOICE%"=="19" (
    echo %BLUE%🔧 压力测试故障排除...%RESET%
    call tools\fix-load-test.bat
    goto :MAIN_MENU
)

if "%CHOICE%"=="20" (
    echo %BLUE%🔍 数据库问题诊断...%RESET%
    call tools\diagnose-database.bat
    goto :MAIN_MENU
)

echo 无效选择，请重新输入
goto :MAIN_MENU