@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

:: 健康守护系统管理员自动启动工具
echo.
echo ================================================
echo              健康守护系统管理员自动启动
echo ================================================
echo.

:: 设置颜色
for /F %%a in ('echo prompt $E ^| cmd') do set "ESC=%%a"
set "GREEN=%ESC%[32m"
set "YELLOW=%ESC%[33m"
set "BLUE=%ESC%[34m"
set "RED=%ESC%[31m"
set "CYAN=%ESC%[36m"
set "WHITE=%ESC%[37m"
set "RESET=%ESC%[0m"

set "WORKSPACE=%~dp0.."
cd /d "%WORKSPACE%"

echo %CYAN%工作目录: %WORKSPACE%%RESET%
echo.

:: 检查3001端口占用情况
echo %BLUE%正在检查端口3001占用情况...%RESET%
netstat -ano | findstr :3001 >nul
if !errorlevel! equ 0 (
    echo %YELLOW%端口3001已被占用，正在停止相关进程...%RESET%
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001') do (
        echo %RED%正在停止进程 %%a...%RESET%
        taskkill /pid %%a /f >nul 2>&1
    )
    timeout /t 2 >nul
    echo %GREEN%端口3001已释放%RESET%
) else (
    echo %GREEN%端口3001未被占用%RESET%
)
echo.

:: 检查并切换到admin-portal目录
echo %BLUE%正在切换到admin-portal目录...%RESET%
cd /d "%WORKSPACE%\admin-portal"
if not exist "package.json" (
    echo %RED%错误：未找到admin-portal目录或package.json文件%RESET%
    echo %YELLOW%请确保在正确的项目目录中运行此脚本%RESET%
    pause
    exit /b 1
)

:: 检查依赖是否安装
echo %BLUE%检查项目依赖...%RESET%
if not exist "node_modules" (
    echo %YELLOW%检测到缺少依赖，正在安装...%RESET%
    npm install
    if !errorlevel! neq 0 (
        echo %RED%依赖安装失败，请检查网络连接和npm配置%RESET%
        pause
        exit /b 1
    )
    echo %GREEN%依赖安装成功%RESET%
) else (
    echo %GREEN%依赖已安装%RESET%
)

:: 设置端口环境变量
set PORT=3001

:: 启动管理员门户
echo.
echo %GREEN%正在启动健康守护管理员门户...%RESET%
echo %CYAN%启动地址: http://localhost:3001%RESET%
echo %CYAN%管理员登录: http://localhost:3001/login%RESET%
echo.
echo %YELLOW%正在启动管理员门户，请等待...%RESET%
echo %CYAN%服务启动后，将自动打开浏览器%RESET%
echo %WHITE%  - 关闭此窗口将停止管理员门户%RESET%
echo.

:: 延迟3秒后打开浏览器
start /b timeout /t 3 >nul 2>&1 && start http://localhost:3001

:: 启动管理员门户（保持窗口打开）
npm start

:: 如果服务停止，显示提示信息
echo.
echo %YELLOW%管理员门户已停止%RESET%
pause
