"""站点统计 API 路由（总工具数 / 最近新增社区组件）"""

from flask import Blueprint, jsonify
from models import CommunityWidget, User
from auth import success

bp = Blueprint("stats", __name__, url_prefix="/api/stats")

CORE_PAGES_COUNT = 6  # weather, memo, countdown, widgets, ranking, workshop
PRESET_WIDGETS_COUNT = 9  # calculator, pomodoro, bmi, colorpicker, stopwatch, charcount, random, password, converter


@bp.get("")
def get_stats():
    approved_count = CommunityWidget.query.filter_by(status="approved").count()
    total_tools = CORE_PAGES_COUNT + PRESET_WIDGETS_COUNT + approved_count

    # 最近新增的6个已审核社区组件
    recent = (
        CommunityWidget.query.filter_by(status="approved")
        .order_by(CommunityWidget.created_at.desc())
        .limit(6)
        .all()
    )

    recent_widgets = []
    for w in recent:
        author = User.query.get(w.author_id)
        recent_widgets.append({
            "id": w.id,
            "widget_id": f"community_{w.id}",
            "name": w.name,
            "icon": w.icon,
            "type": w.type,
            "url": w.url,
            "content": w.content,
            "author_email": author.email if author else "未知",
            "created_at": w.created_at.strftime("%Y-%m-%d %H:%M") if w.created_at else "",
        })

    return jsonify(success(data={
        "total_tools": total_tools,
        "core_pages": CORE_PAGES_COUNT,
        "preset_widgets": PRESET_WIDGETS_COUNT,
        "community_widgets": approved_count,
        "recent_widgets": recent_widgets,
    }))
