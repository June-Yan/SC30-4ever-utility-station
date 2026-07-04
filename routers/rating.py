"""星级评分 API 路由（评分提交 / 查询 / 排行榜）"""

from flask import Blueprint, request, jsonify, make_response
from models import WidgetRating, CommunityWidget
from database import db
from auth import get_current_user, success, error
import sqlalchemy.exc

bp = Blueprint("rating", __name__, url_prefix="/api/rating")


def _no_cache_json(data):
    """返回禁止浏览器缓存的 JSON 响应（防止不同用户看到对方的评分缓存）"""
    resp = make_response(jsonify(data))
    resp.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, proxy-revalidate"
    resp.headers["Pragma"] = "no-cache"
    resp.headers["Expires"] = "0"
    return resp


@bp.post("/")
def submit_rating():
    user, err = get_current_user()
    if err:
        return jsonify(err[0].get_json()), err[1]

    data = request.get_json()
    widget_id = (data.get("widget_id") or "").strip()
    rating = data.get("rating")

    if not widget_id:
        return jsonify(error(40003, "缺少 widget_id"))
    try:
        rating = int(rating)
        if rating < 1 or rating > 5:
            raise ValueError
    except (ValueError, TypeError):
        return jsonify(error(40003, "评分应为 1~5 的整数"))

    existing = WidgetRating.query.filter_by(user_id=user.id, widget_id=widget_id).first()
    if existing:
        existing.rating = rating
    else:
        new_r = WidgetRating(user_id=user.id, widget_id=widget_id, rating=rating)
        db.session.add(new_r)

    try:
        db.session.commit()
    except sqlalchemy.exc.IntegrityError:
        db.session.rollback()
        existing = WidgetRating.query.filter_by(user_id=user.id, widget_id=widget_id).first()
        if existing:
            existing.rating = rating
            db.session.commit()

    return _no_cache_json(success(message="评分已保存"))


@bp.get("/")
def get_rating():
    widget_id = request.args.get("widget_id", "").strip()
    if not widget_id:
        return jsonify(error(40003, "缺少 widget_id"))

    rows = WidgetRating.query.filter_by(widget_id=widget_id).all()
    if not rows:
        return jsonify(success(data={"avg": 0, "count": 0, "distribution": [0, 0, 0, 0, 0]}))

    ratings = [r.rating for r in rows]
    avg = round(sum(ratings) / len(ratings), 1)
    dist = [ratings.count(i) for i in range(1, 6)]

    user_rating = None
    user, err = get_current_user()
    if not err:
        ur = WidgetRating.query.filter_by(user_id=user.id, widget_id=widget_id).first()
        if ur:
            user_rating = ur.rating

    return _no_cache_json(success(data={
        "avg": avg,
        "count": len(ratings),
        "distribution": dist,
        "user_rating": user_rating,
    }))


@bp.get("/ranking")
def star_ranking():
    """Return widgets sorted by average star rating (min 3 ratings to be listed)."""
    # Aggregate via SQL
    results = db.session.query(
        WidgetRating.widget_id,
        db.func.avg(WidgetRating.rating).label("avg_rating"),
        db.func.count(WidgetRating.id).label("rating_count"),
    ).group_by(WidgetRating.widget_id).having(db.func.count(WidgetRating.id) >= 1).order_by(
        db.func.avg(WidgetRating.rating).desc(),
        db.func.count(WidgetRating.id).desc(),
    ).limit(50).all()

    data = []
    for r in results:
        data.append({
            "widget_id": r.widget_id,
            "avg_rating": round(float(r.avg_rating), 1),
            "rating_count": r.rating_count,
        })

    return _no_cache_json(success(data=data))
