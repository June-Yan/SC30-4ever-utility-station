"""创意工坊 API 路由（社区小组件上传 / 浏览 / 审核 / 添加到工具箱）"""

from datetime import datetime, timezone
from flask import Blueprint, request, jsonify
from extensions import limiter
from models import CommunityWidget, WidgetConfig, User
from database import db
from auth import get_current_user, get_admin_user, success, error

bp = Blueprint("workshop", __name__, url_prefix="/api/workshop")


@bp.get("/")
def get_list():
    user, err = get_current_user()
    if err:
        return jsonify(err[0].get_json()), err[1]

    widgets = CommunityWidget.query.filter_by(status="approved").order_by(CommunityWidget.created_at.desc()).all()
    result = []
    for w in widgets:
        author = User.query.get(w.author_id)
        result.append({
            "id": w.id,
            "name": w.name,
            "icon": w.icon,
            "type": w.type,
            "content": w.content,
            "url": w.url,
            "author_email": author.email if author else "未知",
            "created_at": w.created_at.strftime("%Y-%m-%d %H:%M") if w.created_at else "",
        })
    return jsonify(success(data=result))


@bp.get("/pending")
def get_pending():
    user, err = get_admin_user()
    if err:
        return jsonify(err[0].get_json()), err[1]

    widgets = CommunityWidget.query.filter_by(status="pending").order_by(CommunityWidget.created_at.desc()).all()
    result = []
    for w in widgets:
        author = User.query.get(w.author_id)
        result.append({
            "id": w.id,
            "name": w.name,
            "icon": w.icon,
            "type": w.type,
            "content": w.content,
            "url": w.url,
            "author_email": author.email if author else "未知",
            "created_at": w.created_at.strftime("%Y-%m-%d %H:%M") if w.created_at else "",
        })
    return jsonify(success(data=result))


@bp.post("/upload")
@limiter.limit("10 per minute")
def upload():
    user, err = get_current_user()
    if err:
        return jsonify(err[0].get_json()), err[1]

    data = request.get_json()
    name = (data.get("name") or "").strip()
    icon = (data.get("icon") or "🔗").strip()
    wtype = (data.get("type") or "").strip()
    content = data.get("content") or ""
    url = data.get("url") or ""

    if not name:
        return jsonify(error(40003, "请输入小组件名称"))
    if len(name) > 200:
        return jsonify(error(40003, "名称不能超过200字"))
    if any(c in icon for c in "<>&\"'") or len(icon) > 10:
        return jsonify(error(40003, "图标格式无效"))
    if wtype not in ("url", "content", "code"):
        return jsonify(error(40003, "无效的小组件类型"))
    if wtype == "url" and not url.strip():
        return jsonify(error(40003, "快捷链接类型需要填写URL"))
    if wtype == "code" and not content.strip():
        return jsonify(error(40003, "自定义代码类型需要填写代码内容"))
    if wtype == "url" and not url.startswith(("http://", "https://")):
        return jsonify(error(40003, "URL 必须以 http:// 或 https:// 开头"))

    widget = CommunityWidget(
        name=name,
        icon=icon[:10],
        type=wtype,
        content=content,
        url=url[:2000],
        author_id=user.id,
        status="pending",
    )
    db.session.add(widget)
    db.session.commit()

    return jsonify(success(message="上传成功，等待管理员审核"))


@bp.post("/<int:widget_id>/review")
def review(widget_id):
    user, err = get_admin_user()
    if err:
        return jsonify(err[0].get_json()), err[1]

    widget = db.session.get(CommunityWidget, widget_id)
    if not widget:
        return jsonify(error(40401, "小组件不存在"))

    data = request.get_json()
    action = (data.get("action") or "").strip()
    if action not in ("approve", "reject"):
        return jsonify(error(40003, "无效的审核操作"))

    widget.status = "approved" if action == "approve" else "rejected"
    widget.reviewed_at = datetime.now(timezone.utc)
    widget.reviewer_id = user.id
    db.session.commit()

    return jsonify(success(message="已通过" if action == "approve" else "已拒绝"))


@bp.post("/<int:widget_id>/add")
def add_to_my_widgets(widget_id):
    user, err = get_current_user()
    if err:
        return jsonify(err[0].get_json()), err[1]

    widget = db.session.get(CommunityWidget, widget_id)
    if not widget or widget.status != "approved":
        return jsonify(error(40401, "小组件不存在或未通过审核"))

    config_record = WidgetConfig.query.filter_by(user_id=user.id).first()
    if not config_record:
        config_record = WidgetConfig(user_id=user.id, config_json='{"presets":[],"customs":[],"order":[]}')
        db.session.add(config_record)
        db.session.flush()

    import json
    try:
        config = json.loads(config_record.config_json)
    except (json.JSONDecodeError, TypeError):
        config = {"presets": [], "customs": [], "order": []}

    customs = config.get("customs", [])
    order = config.get("order", [])
    community_id = f"community_{widget.id}"

    if any(c.get("id") == community_id for c in customs):
        return jsonify(error(40003, "已添加到工具箱"))

    new_widget = {
        "id": community_id,
        "name": widget.name,
        "icon": widget.icon,
        "type": widget.type,
    }
    if widget.type == "url":
        new_widget["url"] = widget.url
    else:
        new_widget["content"] = widget.content

    customs.append(new_widget)
    if community_id not in order:
        order.append(community_id)

    config["customs"] = customs
    config["order"] = order
    config_record.config_json = json.dumps(config, ensure_ascii=False)
    db.session.commit()

    return jsonify(success(data=config, message="已添加到工具箱"))


@bp.delete("/<int:widget_id>")
def delete_widget(widget_id):
    user, err = get_admin_user()
    if err:
        return jsonify(err[0].get_json()), err[1]

    widget = db.session.get(CommunityWidget, widget_id)
    if not widget:
        return jsonify(error(40401, "小组件不存在"))

    db.session.delete(widget)
    db.session.commit()

    return jsonify(success(message="已删除"))
