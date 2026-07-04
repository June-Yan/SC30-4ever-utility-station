#!/bin/bash
# 实用工具聚合站 — Cloud Studio 一键部署脚本
# 使用方法: bash deploy.sh
# 停止服务: bash stop.sh

set -e

echo "========================================"
echo "  实用工具聚合站 — 一键部署"
echo "========================================"

# ---------- 1. 安装依赖 ----------
echo ""
echo "[1/3] 安装 Python 依赖..."
pip install -r requirements.txt -q

# 创建数据库目录
mkdir -p instance

# ---------- 2. 初始化数据库 ----------
echo "[2/3] 初始化数据库..."
export PYTHONPATH="$(pwd)"
python -c "
from app import app
from database import db
with app.app_context():
    db.create_all()
    print('数据库表已创建')
"

# ---------- 3. 启动服务 ----------
echo "[3/3] 启动 Flask 服务 (端口 3000)..."
export PORT=3000
export DEBUG=True
nohup python app.py > /tmp/utility.log 2>&1 &
PID=$!
echo "  服务 PID: $PID"

sleep 3
if ! kill -0 $PID 2>/dev/null; then
    echo "❌ 服务启动失败，查看日志:"
    cat /tmp/utility.log
    exit 1
fi

echo ""
echo "========================================"
echo "  ✅ 部署完成！"
echo "========================================"
echo ""
echo "  访问地址: http://localhost:3000"
echo ""
echo "  Cloud Studio 会自动将端口映射为可访问链接"
echo "  点击底部「端口」面板中的链接即可打开"
echo ""
echo "  停止服务: bash stop.sh"
echo "========================================"
