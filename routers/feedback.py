"""反馈 API 路由（提交反馈 / 管理员查看 / 回复）"""

from datetime import datetime, timezone
from flask import Blueprint, request, jsonify
from models import Feedback, User
from database import db
from auth import get_current_user, get_admin_user, success, error

bp = Blueprint("feedback", __name__, url_prefix="/api/feedback")


@bp.post("/submit")
def submit_feedback():
    user, err = get_current_user()
    if err:
        return jsonify(err[0].get_json()), err[1]

    data = request.get_json()
    content = (data.get("content") or "").strip()
    if not content:
        return jsonify(error(40001, "反馈内容不能为空"))
    if len(content) > 2000:
        return jsonify(error(40002, "反馈内容不能超过2000字"))

    fb = Feedback(user_id=user.id, content=content)
    db.session.add(fb)
    db.session.commit()

    return jsonify(success(data={"id": fb.id}))


@bp.get("/mine")
def my_feedbacks():
    user, err = get_current_user()
    if err:
        return jsonify(err[0].get_json()), err[1]

    rows = Feedback.query.filter_by(user_id=user.id).order_by(Feedback.created_at.desc()).all()
    return jsonify(success(data=[{
        "id": r.id,
        "content": r.content,
        "status": r.status,
        "reply": r.reply,
        "created_at": r.created_at.isoformat() if r.created_at else None,
        "replied_at": r.replied_at.isoformat() if r.replied_at else None,
    } for r in rows]))


@bp.get("/admin/list")
def admin_list():
    admin, err = get_admin_user()
    if err:
        return jsonify(err[0].get_json()), err[1]

    status_filter = request.args.get("status", "").strip()
    query = Feedback.query
    if status_filter in ("pending", "replied"):
        query = query.filter_by(status=status_filter)
    rows = query.order_by(Feedback.created_at.desc()).all()

    result = []
    for r in rows:
        user = User.query.get(r.user_id)
        result.append({
            "id": r.id,
            "user_email": user.email if user else "未知",
            "content": r.content,
            "status": r.status,
            "reply": r.reply,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "replied_at": r.replied_at.isoformat() if r.replied_at else None,
        })

    return jsonify(success(data=result))


@bp.post("/admin/reply")
def admin_reply():
    admin, err = get_admin_user()
    if err:
        return jsonify(err[0].get_json()), err[1]

    data = request.get_json()
    fb_id = data.get("id")
    reply_text = (data.get("reply") or "").strip()

    if not fb_id:
        return jsonify(error(40001, "缺少反馈ID"))
    if not reply_text:
        return jsonify(error(40002, "回复内容不能为空"))

    fb = Feedback.query.get(fb_id)
    if not fb:
        return jsonify(error(40401, "反馈不存在"))

    fb.reply = reply_text
    fb.status = "replied"
    fb.replied_at = datetime.now(timezone.utc)
    fb.replier_id = admin.id
    db.session.commit()

    return jsonify(success(data={"id": fb.id}))
