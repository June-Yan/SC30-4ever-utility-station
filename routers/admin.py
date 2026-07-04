"""管理员面板 API 路由（仪表盘数据聚合 / 快捷管理）"""

from datetime import datetime, timedelta, timezone
from flask import Blueprint, request, jsonify
from models import CommunityWidget, Feedback, User, ToolUsage
from database import db
from auth import get_admin_user, success, error

bp = Blueprint("admin", __name__, url_prefix="/api/admin")


@bp.get("/dashboard")
def dashboard():
    admin, err = get_admin_user()
    if err:
        return jsonify(err[0].get_json()), err[1]

    # Pending widgets
    pending_widgets_count = CommunityWidget.query.filter_by(status="pending").count()

    # Pending feedbacks
    pending_feedback_count = Feedback.query.filter_by(status="pending").count()

    # Total users
    total_users = User.query.count()

    # Total tool usage clicks (all time)
    total_clicks = db.session.query(db.func.coalesce(db.func.sum(ToolUsage.count), 0)).scalar() or 0

    # Clicks this week
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    week_clicks = (
        db.session.query(db.func.coalesce(db.func.sum(ToolUsage.count), 0))
        .filter(ToolUsage.updated_at >= week_ago)
        .scalar()
    ) or 0

    # Top used tools (all time)
    top_tools = (
        db.session.query(ToolUsage.tool_id, db.func.sum(ToolUsage.count).label("total_count"))
        .group_by(ToolUsage.tool_id)
        .order_by(db.func.sum(ToolUsage.count).desc())
        .limit(5)
        .all()
    )

    # Recent feedbacks (latest 5 pending)
    recent_feedbacks = (
        Feedback.query.filter_by(status="pending")
        .order_by(Feedback.created_at.desc())
        .limit(5)
        .all()
    )

    # Recent pending widgets (latest 5)
    recent_widgets = (
        CommunityWidget.query.filter_by(status="pending")
        .order_by(CommunityWidget.created_at.desc())
        .limit(5)
        .all()
    )

    return jsonify(success(data={
        "stats": {
            "pending_widgets": pending_widgets_count,
            "pending_feedbacks": pending_feedback_count,
            "total_users": total_users,
            "total_clicks": int(total_clicks),
            "week_clicks": int(week_clicks),
        },
        "top_tools": [
            {"tool_id": r.tool_id, "total_count": r.total_count} for r in top_tools
        ],
        "recent_feedbacks": [
            {
                "id": f.id,
                "user_email": User.query.get(f.user_id).email if User.query.get(f.user_id) else "未知",
                "content": f.content[:120] + "..." if len(f.content) > 120 else f.content,
                "created_at": f.created_at.isoformat() if f.created_at else None,
            }
            for f in recent_feedbacks
        ],
        "recent_widgets": [
            {
                "id": w.id,
                "name": w.name,
                "icon": w.icon,
                "type": w.type,
                "author_email": User.query.get(w.author_id).email if User.query.get(w.author_id) else "未知",
                "created_at": w.created_at.strftime("%Y-%m-%d %H:%M") if w.created_at else "",
            }
            for w in recent_widgets
        ],
    }))
