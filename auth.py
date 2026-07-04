"""认证核心模块（bcrypt 密码哈希、JWT 签发验证、请求鉴权）"""

from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
import bcrypt
from flask import request, jsonify
from config import Config
from models import User
from database import db


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def create_access_token(user_id: int) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=Config.JWT_EXPIRY_DAYS)
    payload = {"sub": str(user_id), "exp": expire}
    return jwt.encode(payload, Config.SECRET_KEY, algorithm="HS256")


def decode_access_token(token: str) -> int | None:
    try:
        payload = jwt.decode(token, Config.SECRET_KEY, algorithms=["HS256"])
        return int(payload.get("sub"))
    except (JWTError, ValueError):
        return None


def get_current_user():
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None, (jsonify({"code": 40102, "message": "未登录", "data": None}), 401)

    token = auth_header[7:]
    user_id = decode_access_token(token)
    if user_id is None:
        return None, (jsonify({"code": 40101, "message": "Token 无效或已过期", "data": None}), 401)

    user = db.session.get(User, user_id)
    if user is None:
        return None, (jsonify({"code": 40101, "message": "Token 无效或已过期", "data": None}), 401)

    return user, None


def get_admin_user():
    user, err = get_current_user()
    if err:
        return None, err
    if not user.is_admin:
        return None, (jsonify(error(40301, "需要管理员权限")), 403)
    return user, None


def success(data=None, message="success"):
    return {"code": 0, "message": message, "data": data}


def error(code: int, message: str):
    return {"code": code, "message": message, "data": None}
