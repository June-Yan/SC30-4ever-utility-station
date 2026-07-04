"""应用配置（自动生成 SECRET_KEY、JWT 过期天数、SQLite 数据库路径）"""

import os
import secrets
from dotenv import load_dotenv

load_dotenv()


def _ensure_secret_key():
    env_path = os.path.join(os.path.dirname(__file__), ".env")
    key = os.environ.get("SECRET_KEY")
    if not key:
        key = secrets.token_hex(32)
        with open(env_path, "a", encoding="utf-8") as f:
            f.write(f"\nSECRET_KEY={key}\n")
        os.environ["SECRET_KEY"] = key
    return key


class Config:
    SECRET_KEY = _ensure_secret_key()
    DEBUG = os.environ.get("DEBUG", "False").lower() == "true"
    JWT_EXPIRY_DAYS = int(os.environ.get("JWT_EXPIRY_DAYS", "7"))
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DATABASE_URL",
        "sqlite:///" + os.path.join(os.path.dirname(os.path.abspath(__file__)), "instance", "utility.db"),
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
