#!/bin/bash
# 实用工具聚合站 — 停止服务脚本
# 使用方法: bash stop.sh

echo "正在停止实用工具聚合站服务..."
pkill -f "python app.py" 2>/dev/null && echo "已停止" || echo "没有运行中的服务"
