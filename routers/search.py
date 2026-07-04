"""搜索 API 路由（全局搜索工具 / 小组件 / 社区作品）"""

from flask import Blueprint, request, jsonify
from models import CommunityWidget
from auth import success, error

bp = Blueprint("search", __name__, url_prefix="/api/search")

PRESET_WIDGETS = [
    {"id": "calculator", "icon": "🧮", "name": "计算器", "desc": "加减乘除快速计算~", "type": "preset"},
    {"id": "pomodoro", "icon": "🍅", "name": "番茄钟", "desc": "25分钟专注，5分钟休息♪", "type": "preset"},
    {"id": "bmi", "icon": "📊", "name": "BMI计算", "desc": "输入身高体重，一键计算♡", "type": "preset"},
    {"id": "colorpicker", "icon": "🎨", "name": "取色器", "desc": "颜色选取与格式转换✦", "type": "preset"},
    {"id": "stopwatch", "icon": "⏱️", "name": "秒表", "desc": "精确计时，记录圈数☆", "type": "preset"},
    {"id": "charcount", "icon": "📏", "name": "字数统计", "desc": "文本字数与字符统计~", "type": "preset"},
    {"id": "random", "icon": "🎲", "name": "随机工具", "desc": "随机数、抽签、掷骰子~", "type": "preset"},
    {"id": "password", "icon": "🔐", "name": "密码生成器", "desc": "自定义复杂度安全密码✦", "type": "preset"},
    {"id": "converter", "icon": "📐", "name": "单位换算器", "desc": "长度/重量/温度换算♡", "type": "preset"},
]

CORE_PAGES = [
    {"id": "weather", "icon": "🌤️", "name": "天气查询", "desc": "实时天气与3天预报", "type": "page"},
    {"id": "memo", "icon": "📝", "name": "备忘录", "desc": "随时记录，云端同步", "type": "page"},
    {"id": "countdown", "icon": "⏳", "name": "倒计时", "desc": "设定目标，实时提醒", "type": "page"},
    {"id": "widgets", "icon": "🧩", "name": "工具箱", "desc": "预设工具与自定义小组件", "type": "page"},
    {"id": "ranking", "icon": "🏆", "name": "排行", "desc": "工具使用与星级排行", "type": "page"},
    {"id": "workshop", "icon": "🧑‍🎨", "name": "创意工坊", "desc": "社区小组件分享", "type": "page"},
]


@bp.get("")
def do_search():
    q = request.args.get("q", "").strip().lower()
    if not q or len(q) > 100:
        return jsonify(error(40003, "请输入有效的搜索关键词"))

    results = []

    # Core pages
    for p in CORE_PAGES:
        if q in p["name"].lower() or q in p["desc"].lower():
            results.append({"kind": "page", **p})

    # Preset widgets
    for p in PRESET_WIDGETS:
        if q in p["name"].lower() or q in p["desc"].lower():
            results.append({"kind": "widget", **p})

    # Community widgets (approved)
    widgets = CommunityWidget.query.filter_by(status="approved").all()
    for w in widgets:
        if q in w.name.lower():
            results.append({
                "kind": "community",
                "id": f"community_{w.id}",
                "icon": w.icon,
                "name": w.name,
                "desc": "社区作品",
                "type": w.type,
                "widget_id": w.id,
            })

    # Limit results
    return jsonify(success(data=results[:30]))
