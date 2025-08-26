#!/bin/bash

echo "🚀 启动健康守护服务器..."

# 检查Node.js版本
NODE_VERSION=$(node --version 2>/dev/null)
if [ $? -ne 0 ]; then
    echo "❌ 请先安装 Node.js"
    exit 1
fi

echo "✅ Node.js 版本: $NODE_VERSION"

# 检查是否在server目录
if [ ! -f "package.json" ]; then
    echo "❌ 请在server目录下运行此脚本"
    exit 1
fi

# 安装依赖
if [ ! -d "node_modules" ]; then
    echo "📦 安装依赖包..."
    npm install
fi

# 检查环境配置
if [ ! -f ".env" ]; then
    echo "⚠️  未找到.env文件，请先配置环境变量"
    exit 1
fi

# 运行数据库迁移
echo "🔄 初始化数据库..."
npm run migrate

# 启动服务器
echo "🌟 启动服务器..."
if [ "$1" = "dev" ]; then
    npm run dev
else
    npm start
fi