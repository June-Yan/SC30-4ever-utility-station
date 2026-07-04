"""使用统计 API 路由（工具使用记录/个人常用 TopN/全局排行）"""

from flask import Blueprint, request, jsonify
from models import ToolUsage
from database import db
from auth import get_current_user, success, error
import sqlalchemy.exc

bp = Blueprint("usage", __name__, url_prefix="/api/usage")


@bp.post("/record")
def record_usage():
    user, err = get_current_user()
    if err:
        return jsonify(err[0].get_json()), err[1]

    data = request.get_json()
    tool_id = data.get("tool_id", "").strip()
    if not tool_id:
        return jsonify(error(40003, "缺少 tool_id"))

    try:
        usage = ToolUsage.query.filter_by(user_id=user.id, tool_id=tool_id).first()
        if usage:
            usage.count += 1
        else:
            usage = ToolUsage(user_id=user.id, tool_id=tool_id)
            db.session.add(usage)
        db.session.commit()
    except sqlalchemy.exc.IntegrityError:
        db.session.rollback()
        usage = ToolUsage.query.filter_by(user_id=user.id, tool_id=tool_id).first()
        if usage:
            usage.count += 1
            db.session.commit()

    return jsonify(success(data={"tool_id": tool_id, "count": usage.count}))


@bp.get("/top")
def get_top_tools():
    user, err = get_current_user()
    if err:
        return jsonify(err[0].get_json()), err[1]

    limit = request.args.get("limit", 6, type=int)
    rows = ToolUsage.query.filter_by(user_id=user.id).order_by(
        ToolUsage.count.desc()
    ).limit(limit).all()

    return jsonify(success(data=[
        {"tool_id": r.tool_id, "count": r.count} for r in rows
    ]))


@bp.get("/ranking")
def get_global_ranking():
    limit = request.args.get("limit", 50, type=int)
    results = db.session.query(
        ToolUsage.tool_id,
        db.func.sum(ToolUsage.count).label("total_count")
    ).group_by(
        ToolUsage.tool_id
    ).order_by(
        db.func.sum(ToolUsage.count).desc()
    ).limit(limit).all()

    return jsonify(success(data=[
        {"tool_id": r.tool_id, "total_count": r.total_count} for r in results
    ]))
