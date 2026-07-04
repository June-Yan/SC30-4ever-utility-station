"""数据库 ORM 模型（User / VerificationCode / ToolUsage / Memo / CountdownTarget / WeatherHistory / WidgetConfig / CommunityWidget / Feedback）"""

from datetime import datetime
from database import db


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    hashed_password = db.Column(db.String(255), nullable=False)
    has_password = db.Column(db.Boolean, default=True)
    is_admin = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class VerificationCode(db.Model):
    __tablename__ = "verification_codes"
    __table_args__ = (
        db.Index("ix_vc_email_code", "email", "code"),
    )

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    email = db.Column(db.String(255), nullable=False)
    code = db.Column(db.String(6), nullable=False)
    used = db.Column(db.Boolean, default=False)
    fail_count = db.Column(db.Integer, default=0)
    locked_until = db.Column(db.DateTime, nullable=True)
    expires_at = db.Column(db.DateTime, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class ToolUsage(db.Model):
    __tablename__ = "tool_usage"
    __table_args__ = (
        db.UniqueConstraint("user_id", "tool_id", name="uq_user_tool"),
        db.Index("ix_tool_usage_user_count", "user_id", "count"),
    )

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    tool_id = db.Column(db.String(50), nullable=False)
    count = db.Column(db.Integer, default=1)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Memo(db.Model):
    __tablename__ = "memos"
    __table_args__ = (
        db.Index("ix_memos_user_id", "user_id"),
    )

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    client_id = db.Column(db.String(50), nullable=False)
    title = db.Column(db.String(500), nullable=False)
    content = db.Column(db.Text, default="")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class CountdownTarget(db.Model):
    __tablename__ = "countdown_targets"
    __table_args__ = (
        db.Index("ix_countdown_user_id", "user_id"),
    )

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    target_time = db.Column(db.String(20), nullable=False)
    label = db.Column(db.String(200), default="")
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class WeatherHistory(db.Model):
    __tablename__ = "weather_histories"
    __table_args__ = (
        db.Index("ix_weather_history_user_id", "user_id"),
        db.UniqueConstraint("user_id", "city", name="uq_weather_user_city"),
    )

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    city = db.Column(db.String(100), nullable=False)
    position = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class WidgetConfig(db.Model):
    __tablename__ = "widget_configs"
    __table_args__ = (
        db.UniqueConstraint("user_id", name="uq_widget_config_user"),
    )

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    config_json = db.Column(db.Text, nullable=False, default="{}")
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class CommunityWidget(db.Model):
    __tablename__ = "community_widgets"
    __table_args__ = (
        db.Index("ix_cw_status", "status"),
        db.Index("ix_cw_author", "author_id"),
    )

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(200), nullable=False)
    icon = db.Column(db.String(10), nullable=False, default="🔗")
    type = db.Column(db.String(20), nullable=False)
    content = db.Column(db.Text, default="")
    url = db.Column(db.String(2000), default="")
    author_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    status = db.Column(db.String(20), nullable=False, default="pending")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    reviewed_at = db.Column(db.DateTime, nullable=True)
    reviewer_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="SET NULL"), nullable=True)


class Feedback(db.Model):
    __tablename__ = "feedbacks"
    __table_args__ = (
        db.Index("ix_fb_status", "status"),
    )

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    content = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(20), nullable=False, default="pending")
    reply = db.Column(db.Text, default="")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    replied_at = db.Column(db.DateTime, nullable=True)
    replier_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="SET NULL"), nullable=True)


class WidgetRating(db.Model):
    __tablename__ = "widget_ratings"
    __table_args__ = (
        db.UniqueConstraint("user_id", "widget_id", name="uq_user_widget_rating"),
        db.Index("ix_wr_widget", "widget_id"),
    )

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    widget_id = db.Column(db.String(50), nullable=False)
    rating = db.Column(db.Integer, nullable=False, default=5)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
