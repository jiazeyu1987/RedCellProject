@echo off
chcp 65001 >nul 2>&1
echo 正在切换到server目录并运行代码覆盖率测试...
cd ./server
echo 当前目录: %cd%
echo 开始运行代码覆盖率测试...
npx jest --coverage --verbose
echo.
echo 测试完成，按任意键退出...
pause