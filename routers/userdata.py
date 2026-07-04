"""用户数据 API 路由（备忘录 CRUD/倒计时/天气历史/小组件配置/数据同步）"""

import json
from flask import Blueprint, request, jsonify
from models import Memo, CountdownTarget, WeatherHistory, WidgetConfig
from database import db
from auth import get_current_user, success, error

bp = Blueprint("userdata", __name__, url_prefix="/api/userdata")


# ===== MEMOS =====

@bp.get("/memos")
def get_memos():
    user, err = get_current_user()
    if err:
        return jsonify(err[0].get_json()), err[1]
    memos = Memo.query.filter_by(user_id=user.id).order_by(Memo.created_at.desc()).all()
    return jsonify(success(data=[{
        "id": m.id, "client_id": m.client_id,
        "title": m.title, "content": m.content,
        "created_at": m.created_at.strftime("%Y-%m-%d %H:%M") if m.created_at else "",
    } for m in memos]))


@bp.post("/memos")
def create_memo():
    user, err = get_current_user()
    if err:
        return jsonify(err[0].get_json()), err[1]
    data = request.get_json()
    title = data.get("title", "").strip()
    if not title:
        return jsonify(error(40003, "标题不能为空"))
    memo = Memo(
        user_id=user.id,
        client_id=data.get("client_id", ""),
        title=title,
        content=data.get("content", ""),
    )
    db.session.add(memo)
    db.session.commit()
    return jsonify(success(data={
        "id": memo.id, "client_id": memo.client_id,
        "title": memo.title, "content": memo.content,
        "created_at": memo.created_at.strftime("%Y-%m-%d %H:%M") if memo.created_at else "",
    }, message="创建成功"))


@bp.put("/memos/<int:memo_id>")
def update_memo(memo_id):
    user, err = get_current_user()
    if err:
        return jsonify(err[0].get_json()), err[1]
    memo = db.session.get(Memo, memo_id)
    if not memo or memo.user_id != user.id:
        return jsonify(error(40401, "备忘录不存在"))
    data = request.get_json()
    if "title" in data:
        memo.title = data["title"]
    if "content" in data:
        memo.content = data["content"]
    db.session.commit()
    return jsonify(success(data={
        "id": memo.id, "client_id": memo.client_id,
        "title": memo.title, "content": memo.content,
        "created_at": memo.created_at.strftime("%Y-%m-%d %H:%M") if memo.created_at else "",
    }))


@bp.delete("/memos/<int:memo_id>")
def delete_memo(memo_id):
    user, err = get_current_user()
    if err:
        return jsonify(err[0].get_json()), err[1]
    memo = db.session.get(Memo, memo_id)
    if not memo or memo.user_id != user.id:
        return jsonify(error(40401, "备忘录不存在"))
    db.session.delete(memo)
    db.session.commit()
    return jsonify(success(message="已删除"))


# ===== COUNTDOWN =====

@bp.get("/countdown")
def get_countdown():
    user, err = get_current_user()
    if err:
        return jsonify(err[0].get_json()), err[1]
    cd = CountdownTarget.query.filter_by(user_id=user.id).first()
    if cd:
        return jsonify(success(data={"target_time": cd.target_time, "label": cd.label}))
    return jsonify(success(data=None))


@bp.put("/countdown")
def set_countdown():
    user, err = get_current_user()
    if err:
        return jsonify(err[0].get_json()), err[1]
    data = request.get_json()
    target_time = data.get("target_time", "").strip()
    if not target_time:
        return jsonify(error(40003, "请设置目标时间"))
    cd = CountdownTarget.query.filter_by(user_id=user.id).first()
    if cd:
        cd.target_time = target_time
        cd.label = data.get("label", "")
    else:
        cd = CountdownTarget(user_id=user.id, target_time=target_time, label=data.get("label", ""))
        db.session.add(cd)
    db.session.commit()
    return jsonify(success(data={"target_time": cd.target_time, "label": cd.label}))


@bp.delete("/countdown")
def delete_countdown():
    user, err = get_current_user()
    if err:
        return jsonify(err[0].get_json()), err[1]
    cd = CountdownTarget.query.filter_by(user_id=user.id).first()
    if cd:
        db.session.delete(cd)
        db.session.commit()
    return jsonify(success(message="已重置"))


# ===== COUNTDOWN LIST (multi-target) =====

@bp.get("/countdowns")
def get_countdowns():
    user, err = get_current_user()
    if err:
        return jsonify(err[0].get_json()), err[1]
    items = CountdownTarget.query.filter_by(user_id=user.id).order_by(CountdownTarget.target_time).all()
    return jsonify(success(data=[{
        "id": c.id, "target_time": c.target_time, "label": c.label,
        "updated_at": c.updated_at.strftime("%Y-%m-%d %H:%M") if c.updated_at else "",
    } for c in items]))


@bp.post("/countdowns")
def create_countdown():
    user, err = get_current_user()
    if err:
        return jsonify(err[0].get_json()), err[1]
    data = request.get_json()
    target_time = data.get("target_time", "").strip()
    if not target_time:
        return jsonify(error(40003, "请设置目标时间"))
    cd = CountdownTarget(user_id=user.id, target_time=target_time, label=data.get("label", ""))
    db.session.add(cd)
    db.session.commit()
    return jsonify(success(data={
        "id": cd.id, "target_time": cd.target_time, "label": cd.label,
    }, message="创建成功"))


@bp.put("/countdowns/<int:cd_id>")
def update_countdown(cd_id):
    user, err = get_current_user()
    if err:
        return jsonify(err[0].get_json()), err[1]
    cd = db.session.get(CountdownTarget, cd_id)
    if not cd or cd.user_id != user.id:
        return jsonify(error(40401, "倒计时不存在"))
    data = request.get_json()
    if "target_time" in data:
        cd.target_time = data["target_time"]
    if "label" in data:
        cd.label = data["label"]
    db.session.commit()
    return jsonify(success(data={
        "id": cd.id, "target_time": cd.target_time, "label": cd.label,
    }))


@bp.delete("/countdowns/<int:cd_id>")
def delete_countdown_item(cd_id):
    user, err = get_current_user()
    if err:
        return jsonify(err[0].get_json()), err[1]
    cd = db.session.get(CountdownTarget, cd_id)
    if not cd or cd.user_id != user.id:
        return jsonify(error(40401, "倒计时不存在"))
    db.session.delete(cd)
    db.session.commit()
    return jsonify(success(message="已删除"))


# ===== WEATHER HISTORY =====

@bp.get("/weather-history")
def get_weather_history():
    user, err = get_current_user()
    if err:
        return jsonify(err[0].get_json()), err[1]
    rows = WeatherHistory.query.filter_by(user_id=user.id).order_by(WeatherHistory.position).all()
    return jsonify(success(data=[r.city for r in rows]))


@bp.post("/weather-history")
def add_weather_city():
    user, err = get_current_user()
    if err:
        return jsonify(err[0].get_json()), err[1]
    data = request.get_json()
    city = data.get("city", "").strip()
    if not city:
        return jsonify(error(40003, "城市名不能为空"))

    # Shift all existing positions +1
    WeatherHistory.query.filter_by(user_id=user.id).update({WeatherHistory.position: WeatherHistory.position + 1})

    existing = WeatherHistory.query.filter_by(user_id=user.id, city=city).first()
    if existing:
        existing.position = 0
    else:
        db.session.add(WeatherHistory(user_id=user.id, city=city, position=0))

    # Keep max 10
    all_rows = WeatherHistory.query.filter_by(user_id=user.id).order_by(WeatherHistory.position).all()
    for r in all_rows[10:]:
        db.session.delete(r)

    db.session.commit()
    rows = WeatherHistory.query.filter_by(user_id=user.id).order_by(WeatherHistory.position).all()
    return jsonify(success(data=[r.city for r in rows]))


@bp.delete("/weather-history/<path:city>")
def remove_weather_city(city):
    user, err = get_current_user()
    if err:
        return jsonify(err[0].get_json()), err[1]
    existing = WeatherHistory.query.filter_by(user_id=user.id, city=city).first()
    if existing:
        db.session.delete(existing)
        # Re-order positions
        rows = WeatherHistory.query.filter_by(user_id=user.id).order_by(WeatherHistory.position).all()
        for i, r in enumerate(rows):
            r.position = i
        db.session.commit()
    rows = WeatherHistory.query.filter_by(user_id=user.id).order_by(WeatherHistory.position).all()
    return jsonify(success(data=[r.city for r in rows]))


# ===== WIDGET CONFIG =====

@bp.get("/widget-config")
def get_widget_config():
    user, err = get_current_user()
    if err:
        return jsonify(err[0].get_json()), err[1]
    wc = WidgetConfig.query.filter_by(user_id=user.id).first()
    if wc:
        return jsonify(success(data=json.loads(wc.config_json)))
    return jsonify(success(data=None))


@bp.put("/widget-config")
def save_widget_config():
    user, err = get_current_user()
    if err:
        return jsonify(err[0].get_json()), err[1]
    data = request.get_json()
    config_json = json.dumps(data, ensure_ascii=False)
    wc = WidgetConfig.query.filter_by(user_id=user.id).first()
    if wc:
        wc.config_json = config_json
    else:
        wc = WidgetConfig(user_id=user.id, config_json=config_json)
        db.session.add(wc)
    db.session.commit()
    return jsonify(success(data=data))


# ===== SYNC =====

@bp.post("/sync")
def sync_data():
    user, err = get_current_user()
    if err:
        return jsonify(err[0].get_json()), err[1]
    data = request.get_json() or {}

    result = {}

    # Memos: server-first
    server_memos = Memo.query.filter_by(user_id=user.id).order_by(Memo.created_at.desc()).all()
    if server_memos:
        result["memo_list"] = [{
            "id": m.id, "client_id": m.client_id,
            "title": m.title, "content": m.content,
            "createTime": m.created_at.strftime("%Y-%m-%d %H:%M") if m.created_at else "",
        } for m in server_memos]
    elif data.get("memo_list"):
        for m in data["memo_list"]:
            db.session.add(Memo(
                user_id=user.id,
                client_id=m.get("id", ""),
                title=m.get("title", ""),
                content=m.get("content", ""),
            ))
        result["memo_list"] = data["memo_list"]
    else:
        result["memo_list"] = []

    # Countdown: server-first
    cd = CountdownTarget.query.filter_by(user_id=user.id).first()
    if cd:
        result["countdown_target"] = {"targetTime": cd.target_time, "label": cd.label}
    elif data.get("countdown_target"):
        ct = data["countdown_target"]
        db.session.add(CountdownTarget(user_id=user.id, target_time=ct.get("targetTime", ""), label=ct.get("label", "")))
        result["countdown_target"] = ct
    else:
        result["countdown_target"] = None

    # Weather history: server-first
    wh_rows = WeatherHistory.query.filter_by(user_id=user.id).order_by(WeatherHistory.position).all()
    if wh_rows:
        result["weather_history"] = [r.city for r in wh_rows]
    elif data.get("weather_history"):
        for i, city in enumerate(data["weather_history"][:10]):
            db.session.add(WeatherHistory(user_id=user.id, city=city, position=i))
        result["weather_history"] = data["weather_history"][:10]
    else:
        result["weather_history"] = []

    # Widget config: server-first
    wc = WidgetConfig.query.filter_by(user_id=user.id).first()
    if wc:
        result["widget_config"] = json.loads(wc.config_json)
    elif data.get("widget_config"):
        db.session.add(WidgetConfig(user_id=user.id, config_json=json.dumps(data["widget_config"], ensure_ascii=False)))
        result["widget_config"] = data["widget_config"]
    else:
        result["widget_config"] = None

    db.session.commit()
    return jsonify(success(data=result))
