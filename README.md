# 🌸 实用工具聚合站

一站式在线实用工具集合，樱花粉紫动漫风格，支持账号登录与游客模式。

## 技术栈

| 层级 | 技术 |
|------|------|
| 后端 | Python 3 + Flask 3.1 + SQLAlchemy 3.1 |
| 数据库 | SQLite（SQLAlchemy ORM，外键约束 + 级联删除） |
| 认证 | bcrypt 密码哈希 + JWT (HS256, 7天有效) |
| 前端 | 原生 JS SPA（无框架）+ CSS3 变量动画 |
| 天气 | wttr.in 免费公开 API（后端代理绕 CORS） |
| 字体 | Google Fonts（Zen Maru Gothic + Noto Sans SC） |

## 功能一览

### 页面
- **首页** — 常用工具展示（6槽位，按使用频率排序）
- **天气查询** — 实时天气 + 3天预报 + 历史城市 + 分享卡片
- **备忘录** — 增删改查 + 搜索 + 分享
- **倒计时** — 设定目标 + 实时倒计时 + 到达提醒
- **工具箱** — 9款预设工具 + 自定义小组件
- **使用排行** — 全局工具点击量排行 + 汇总统计

### 9款预设工具
🧮 计算器 | 🍅 番茄钟 | 📊 BMI计算 | 🎨 取色器 | ⏱️ 秒表 | 📏 字数统计 | 🎲 随机工具 | 🔐 密码生成器 | 📐 单位换算器

### 自定义小组件
- **快捷链接** — 新窗口打开指定 URL
- **静态内容** — 展示纯文本
- **自定义代码** — 可执行 HTML/JS，支持 `showToast()` 和 `storage` API

### 用户系统
- 邮箱 + 密码登录 / 邮箱 + 验证码登录（无账号自动注册）
- 游客模式（数据仅存本地 localStorage）
- 登录时自动同步本地数据到服务器（服务端优先）

## 项目结构

```
utility-station/
├── app.py              # Flask 主应用（路由、天气代理）
├── auth.py             # 认证核心（bcrypt/JWT/鉴权）
├── config.py           # 配置管理（.env 加载）
├── database.py         # 数据库初始化（SQLAlchemy + 外键）
├── models.py           # ORM 模型（7张表）
├── requirements.txt    # Python 依赖
├── deploy.sh           # Cloud Studio 一键部署
├── stop.sh             # 停止服务
├── routers/
│   ├── auth.py         # 认证 API（/api/auth/*）
│   ├── userdata.py     # 用户数据 API（/api/userdata/*）
│   └── usage.py        # 使用统计 API（/api/usage/*）
├── templates/
│   └── index.html      # SPA 主页面
├── static/
│   ├── app.js          # 前端核心逻辑
│   └── style.css       # 全局样式
└── tasks.md            # 任务清单
```

## 数据库表

| 表名 | 说明 |
|------|------|
| users | 用户账号 |
| verification_codes | 验证码（5分钟过期/60秒冷却/5次错误锁定30分钟） |
| tool_usage | 工具使用次数（user_id + tool_id 唯一） |
| memos | 备忘录 |
| countdown_targets | 倒计时目标（每用户1条） |
| weather_histories | 天气搜索历史（每用户最多10城） |
| widget_configs | 小组件配置（每用户1条 JSON） |

## API 概览

| 前缀 | 功能 | 认证 |
|------|------|------|
| `/api/auth/*` | 验证码/注册/登录/注销 | 部分需要 |
| `/api/userdata/*` | 备忘录/倒计时/天气历史/小组件/数据同步 | 需要 |
| `/api/usage/*` | 使用记录/个人TopN/全局排行 | 部分需要 |
| `/api/weather` | 天气查询代理 | 不需要 |

## 本地运行

```bash
pip install -r requirements.txt
python app.py
```

访问 http://127.0.0.1:5000

## Cloud Studio 部署

```bash
bash deploy.sh    # 一键部署（端口 3000）
bash stop.sh      # 停止服务
```
