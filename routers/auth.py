"""认证 API 路由（验证码发送/注册/密码登录/验证码登录/注销/设密码/重置密码）"""

import random
import smtplib
import sqlalchemy.exc
from datetime import datetime, timedelta, timezone
from email.mime.text import MIMEText
from flask import Blueprint, request, jsonify
from extensions import limiter
from models import User, VerificationCode
from database import db
from config import Config
from auth import hash_password, verify_password, create_access_token, get_current_user, success, error

bp = Blueprint("auth", __name__, url_prefix="/api/auth")


def _send_email(to_email: str, subject: str, body: str) -> bool:
    """通过 SMTP 发送邮件。SMTP 未配置时返回 False，由调用方回退到 DEBUG 模式。"""
    if not Config.SMTP_USER or not Config.SMTP_PASSWORD:
        return False
    try:
        msg = MIMEText(body, "plain", "utf-8")
        msg["Subject"] = subject
        msg["From"] = Config.SMTP_FROM
        msg["To"] = to_email

        with smtplib.SMTP(Config.SMTP_HOST, Config.SMTP_PORT, timeout=10) as server:
            server.starttls()
            server.login(Config.SMTP_USER, Config.SMTP_PASSWORD)
            server.sendmail(Config.SMTP_FROM, [to_email], msg.as_string())
        return True
    except Exception:
        return False


@bp.post("/send-code")
@limiter.limit("5 per minute")
def send_code():
    data = request.get_json()
    email = data.get("email", "").strip()
    if not email or "@" not in email or len(email) > 200:
        return jsonify(error(40003, "请输入有效的邮箱地址"))

    now = datetime.now(timezone.utc)
    latest_vc = VerificationCode.query.filter_by(email=email).order_by(VerificationCode.created_at.desc()).first()
    if latest_vc and latest_vc.locked_until and latest_vc.locked_until.replace(tzinfo=timezone.utc) > now:
        return jsonify(error(40010, "验证码验证错误次数过多，请稍后再试"))

    if latest_vc and latest_vc.created_at.replace(tzinfo=timezone.utc) > now - timedelta(seconds=60):
        return jsonify(error(40009, "验证码发送过于频繁，请60秒后重试"))

    code = str(random.randint(100000, 999999))
    vc = VerificationCode(
        email=email,
        code=code,
        expires_at=now + timedelta(minutes=5),
    )
    db.session.add(vc)
    db.session.commit()

    # 尝试发送真实邮件
    email_sent = _send_email(
        email,
        "实用工具聚合站 — 验证码",
        f"您的验证码是：{code}\n\n5分钟内有效，请勿告诉他人。"
    )

    if email_sent:
        return jsonify(success(message="验证码已发送至您的邮箱"))
    elif Config.DEBUG:
        # 邮件发送失败且 DEBUG=True：前端直接显示验证码（方便本地测试）
        return jsonify(success(data={"code": code}, message="验证码已发送（调试模式）"))
    else:
        return jsonify(error(50001, "邮件发送失败，请稍后重试"))


@bp.post("/register")
@limiter.limit("5 per minute")
def register():
    data = request.get_json()
    email = data.get("email", "").strip()
    password = data.get("password", "")
    code = data.get("code", "")

    if not email or "@" not in email:
        return jsonify(error(40003, "请输入有效的邮箱地址"))
    if len(password) < 6 or len(password) > 128:
        return jsonify(error(40004, "密码长度应为 6-128 位"))
    if len(code) != 6 or not code.isdigit():
        return jsonify(error(40001, "请输入 6 位验证码"))

    if User.query.filter_by(email=email).first():
        return jsonify(error(40002, "邮箱已注册"))

    now = datetime.now(timezone.utc)
    all_unused = VerificationCode.query.filter_by(
        email=email, used=False
    ).filter(VerificationCode.expires_at > now).order_by(
        VerificationCode.created_at.desc()
    ).all()

    vc = None
    for c in all_unused:
        if c.code == code:
            vc = c
            break

    if not vc:
        if all_unused:
            latest = all_unused[0]
            latest.fail_count = (latest.fail_count or 0) + 1
            if latest.fail_count >= 5:
                latest.locked_until = now + timedelta(minutes=30)
            db.session.commit()
        return jsonify(error(40001, "验证码错误或已过期"))

    vc.fail_count = 0
    vc.used = True
    user = User(email=email, hashed_password=hash_password(password), has_password=True)
    db.session.add(user)

    try:
        db.session.commit()
    except sqlalchemy.exc.IntegrityError:
        db.session.rollback()
        return jsonify(error(40002, "邮箱已注册"))

    token = create_access_token(user.id)
    return jsonify(success(data={"token": token, "user": {"id": user.id, "email": user.email, "is_admin": user.is_admin}}, message="注册成功"))


@bp.post("/login-password")
@limiter.limit("10 per minute")
def login_password():
    data = request.get_json()
    email = data.get("email", "").strip()
    password = data.get("password", "")

    user = User.query.filter_by(email=email).first()
    if not user or not verify_password(password, user.hashed_password):
        return jsonify(error(40101, "邮箱或密码错误"))

    token = create_access_token(user.id)
    return jsonify(success(data={"token": token, "user": {"id": user.id, "email": user.email, "is_admin": user.is_admin}}, message="登录成功"))


@bp.post("/login-code")
@limiter.limit("10 per minute")
def login_code():
    data = request.get_json()
    email = data.get("email", "").strip()
    code = data.get("code", "")

    if len(code) != 6 or not code.isdigit():
        return jsonify(error(40001, "请输入 6 位验证码"))

    now = datetime.now(timezone.utc)
    all_unused = VerificationCode.query.filter_by(
        email=email, used=False
    ).filter(VerificationCode.expires_at > now).order_by(
        VerificationCode.created_at.desc()
    ).all()

    vc = None
    for c in all_unused:
        if c.code == code:
            vc = c
            break

    if not vc:
        if all_unused:
            latest = all_unused[0]
            latest.fail_count = (latest.fail_count or 0) + 1
            if latest.fail_count >= 5:
                latest.locked_until = now + timedelta(minutes=30)
            db.session.commit()
        return jsonify(error(40001, "验证码错误或已过期"))

    vc.fail_count = 0
    vc.used = True
    user = User.query.filter_by(email=email).first()

    if not user:
        user = User(email=email, hashed_password=hash_password(str(random.randint(100000, 999999))), has_password=False)
        db.session.add(user)

    db.session.commit()

    token = create_access_token(user.id)
    return jsonify(success(data={"token": token, "user": {"id": user.id, "email": user.email, "is_admin": user.is_admin}}, message="登录成功"))


@bp.post("/logout")
def logout():
    user, err = get_current_user()
    if err:
        return jsonify(err[0].get_json()), err[1]
    return jsonify(success(message="已退出登录"))


@bp.delete("/account")
def delete_account():
    user, err = get_current_user()
    if err:
        return jsonify(err[0].get_json()), err[1]
    db.session.delete(user)
    db.session.commit()
    return jsonify(success(message="账户已注销"))


@bp.get("/me")
def get_me():
    user, err = get_current_user()
    if err:
        return jsonify(err[0].get_json()), err[1]
    return jsonify(success(data={"id": user.id, "email": user.email, "has_password": user.has_password, "is_admin": user.is_admin}))


@bp.post("/set-password")
def set_password():
    user, err = get_current_user()
    if err:
        return jsonify(err[0].get_json()), err[1]

    data = request.get_json()
    password = data.get("password", "")

    if len(password) < 6 or len(password) > 128:
        return jsonify(error(40004, "密码长度应为 6-128 位"))

    user.hashed_password = hash_password(password)
    user.has_password = True
    db.session.commit()

    return jsonify(success(message="密码设置成功"))


@bp.post("/reset-password")
@limiter.limit("5 per minute")
def reset_password():
    data = request.get_json()
    email = data.get("email", "").strip()
    code = data.get("code", "")
    password = data.get("password", "")

    if not email or "@" not in email:
        return jsonify(error(40003, "请输入有效的邮箱地址"))
    if len(code) != 6 or not code.isdigit():
        return jsonify(error(40001, "请输入 6 位验证码"))
    if len(password) < 6 or len(password) > 128:
        return jsonify(error(40004, "密码长度应为 6-128 位"))

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify(error(40101, "该邮箱未注册"))

    now = datetime.now(timezone.utc)
    all_unused = VerificationCode.query.filter_by(
        email=email, used=False
    ).filter(VerificationCode.expires_at > now).order_by(
        VerificationCode.created_at.desc()
    ).all()

    vc = None
    for c in all_unused:
        if c.code == code:
            vc = c
            break

    if not vc:
        if all_unused:
            latest = all_unused[0]
            latest.fail_count = (latest.fail_count or 0) + 1
            if latest.fail_count >= 5:
                latest.locked_until = now + timedelta(minutes=30)
            db.session.commit()
        return jsonify(error(40001, "验证码错误或已过期"))

    vc.fail_count = 0
    vc.used = True
    user.hashed_password = hash_password(password)
    user.has_password = True
    db.session.commit()

    return jsonify(success(message="密码重置成功"))
