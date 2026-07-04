"""数据库初始化（SQLAlchemy 实例、SQLite 外键约束、自动建表、数据迁移）"""

import os
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import event
from config import Config

db = SQLAlchemy()


def init_app(app):
    app.config.from_object(Config)
    db.init_app(app)

    with app.app_context():
        from sqlalchemy import text, inspect
        with db.engine.connect() as conn:
            conn.execute(text("PRAGMA foreign_keys=ON"))
            conn.commit()

        # 迁移：移除 countdown_targets 的 user_id 唯一约束，支持多目标
        inspector = inspect(db.engine)
        if inspector.has_table("countdown_targets"):
            unique_constraints = inspector.get_unique_constraints("countdown_targets")
            has_uq = any(uc.get("name") == "uq_countdown_user" for uc in unique_constraints)
            if has_uq:
                with db.engine.connect() as conn:
                    conn.execute(text("PRAGMA foreign_keys=OFF"))
                    conn.commit()
                    conn.execute(text("CREATE TABLE countdown_targets_backup AS SELECT * FROM countdown_targets"))
                    conn.execute(text("DROP TABLE countdown_targets"))
                    conn.execute(text("""
                        CREATE TABLE countdown_targets (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                            target_time VARCHAR(20) NOT NULL,
                            label VARCHAR(200) DEFAULT '',
                            updated_at DATETIME
                        )
                    """))
                    conn.execute(text("INSERT INTO countdown_targets SELECT * FROM countdown_targets_backup"))
                    conn.execute(text("DROP TABLE countdown_targets_backup"))
                    conn.execute(text("PRAGMA foreign_keys=ON"))
                    conn.commit()

        db.create_all()

        # 迁移：重建旧的 feedbacks 表（如结构不匹配）
        if inspector.has_table("feedbacks"):
            fb_columns = [col["name"] for col in inspector.get_columns("feedbacks")]
            if "reply" not in fb_columns or "replier_id" not in fb_columns:
                with db.engine.connect() as conn:
                    conn.execute(text("PRAGMA foreign_keys=OFF"))
                    conn.commit()
                    conn.execute(text("DROP TABLE feedbacks"))
                    conn.execute(text("PRAGMA foreign_keys=ON"))
                    conn.commit()
                db.create_all()

        # 迁移：为 users 表添加 is_admin 列
        if inspector.has_table("users"):
            columns = [col["name"] for col in inspector.get_columns("users")]
            if "is_admin" not in columns:
                with db.engine.connect() as conn:
                    conn.execute(text("ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT 0 NOT NULL"))
                    conn.commit()

        # 迁移：重建 widget_ratings 表（如结构不匹配）
        if inspector.has_table("widget_ratings"):
            wr_columns = [col["name"] for col in inspector.get_columns("widget_ratings")]
            if "updated_at" not in wr_columns:
                with db.engine.connect() as conn:
                    conn.execute(text("PRAGMA foreign_keys=OFF"))
                    conn.commit()
                    conn.execute(text("DROP TABLE widget_ratings"))
                    conn.execute(text("PRAGMA foreign_keys=ON"))
                    conn.commit()
                db.create_all()
        else:
            db.create_all()

        # 创建或更新预设管理员账号
        from models import User
        from auth import hash_password
        admin_email = os.environ.get("ADMIN_EMAIL", "admin@utility.com")
        admin_password_env = os.environ.get("ADMIN_PASSWORD")

        admin = User.query.filter_by(email=admin_email).first()
        if not admin:
            # 新建管理员
            admin_password = admin_password_env
            if not admin_password:
                import secrets
                admin_password = secrets.token_urlsafe(12)
                print(f"\n{'='*50}")
                print(f"  管理员账号已自动创建")
                print(f"  邮箱: {admin_email}")
                print(f"  密码: {admin_password}")
                print(f"  请妥善保存此密码，或通过环境变量 ADMIN_PASSWORD 设置")
                print(f"{'='*50}\n")
            admin = User(
                email=admin_email,
                hashed_password=hash_password(admin_password),
                has_password=True,
                is_admin=True,
            )
            db.session.add(admin)
            db.session.commit()
        elif admin_password_env:
            # 已有管理员且环境变量指定了新密码 → 更新密码
            admin.hashed_password = hash_password(admin_password_env)
            admin.has_password = True
            db.session.commit()
            print(f"\n{'='*50}")
            print(f"  管理员密码已更新（来自环境变量 ADMIN_PASSWORD）")
            print(f"  邮箱: {admin_email}")
            print(f"{'='*50}\n")

        # 启动诊断：DEBUG 模式与环境变量
        print(f"\n  [诊断] DEBUG 模式: {Config.DEBUG}")
        print(f"  [诊断] ADMIN_EMAIL 环境变量: {admin_email}")
        print(f"  [诊断] ADMIN_PASSWORD 环境变量: {'已设置' if admin_password_env else '未设置'}")
        print(f"  [诊断] 当前管理员密码来源: {'环境变量' if admin_password_env else '数据库旧密码 / 自动生成'}")
        if Config.DEBUG:
            print(f"  [诊断] 验证码将以明文方式返回（DEBUG=True）")
        else:
            print(f"  [诊断] 验证码不会明文返回（DEBUG=False），如需调试请设置环境变量 DEBUG=True")
        print()

