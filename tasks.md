# 实用工具聚合站 — 任务清单

技术栈：Flask 3.1 + Flask-SQLAlchemy + bcrypt + python-jose（后端）；原生 JS + HTML/CSS（前端）。

标记说明：[x] 已完成，[ ] 待开发。

---

## 一、已完成（基线功能）

### 任务 1：搭建后端项目骨架 — Flask 应用、配置、数据库、蓝图注册
- [x] 1.1 config.py（环境变量、SECRET_KEY 自动生成、JWT 有效期 7 天）
- [x] 1.2 database.py（SQLAlchemy 初始化、SQLite 外键约束、自动建表）
- [x] 1.3 app.py（Flask 入口，注册 auth/usage/userdata 蓝图，天气路由，LAN IP）
- [x] 1.4 requirements.txt（flask/flask-sqlalchemy/bcrypt/python-jose/python-dotenv/requests）

### 任务 2：实现后端数据模型 — models.py
- [x] 2.1 User（email 唯一、hashed_password、has_password 标记无密码账号）
- [x] 2.2 VerificationCode（6 位码、used、fail_count、locked_until、expires_at）
- [x] 2.3 ToolUsage（user_id + tool_id 唯一约束、count）
- [x] 2.4 Memo（client_id、title、content、时间戳）
- [x] 2.5 CountdownTarget（多目标，user_id 索引，无唯一约束）
- [x] 2.6 WeatherHistory（城市历史，user+city 唯一，position 排序，上限 10）
- [x] 2.7 WidgetConfig（config_json，单条 per user）

### 任务 3：实现后端认证模块 — routers/auth.py + auth.py
- [x] 3.1 auth.py：密码哈希（bcrypt）、JWT 生成与校验、get_current_user 依赖、统一响应 success/error
- [x] 3.2 send-code（60s 冷却、5 次错误锁定 30min、5min 过期）
- [x] 3.3 register（验证码校验 + 注册即登录）
- [x] 3.4 login-password / login-code（验证码登录未注册则自动创建无密码账号）
- [x] 3.5 logout / account (DELETE 注销) / set-password / me

### 任务 4：实现后端用户数据模块 — routers/userdata.py
- [x] 4.1 备忘录 CRUD（按时间倒序、user_id 隔离）
- [x] 4.2 倒计时多目标 get/set/delete + 列表 CRUD
- [x] 4.3 天气历史城市管理（最多 10、position 排序）
- [x] 4.4 小组件配置 get/save
- [x] 4.5 登录同步 sync（云端优先，本地数据合并为新增）

### 任务 5：实现后端使用统计模块 — routers/usage.py
- [x] 5.1 POST /api/usage/record（记录使用次数，并发安全）
- [x] 5.2 GET /api/usage/top（常用工具排行，按 count 降序）
- [x] 5.3 GET /api/usage/ranking（全局工具使用排行，公开接口）

### 任务 6：实现后端天气查询 — app.py /api/weather
- [x] 6.1 调用 wttr.in，当前天气 + 3 天预报
- [x] 6.2 英文描述 → 中文 + emoji 映射
- [x] 6.3 超时/异常/未找到城市处理

### 任务 7：搭建前端基础架构 — templates/index.html + static/app.js + static/style.css
- [x] 7.1 顶部导航栏（首页/天气/备忘/倒计时/工具箱/排行 + 用户区 + 移动端汉堡菜单）
- [x] 7.2 登录页（密码/验证码/注册 Tab、游客模式、60s 倒计时、开发环境回显验证码）
- [x] 7.3 全局工具（toast/confirm/copyText/storage/escapeHtml/genId）
- [x] 7.4 auth 状态管理 + API 封装 + 401 自动跳登录
- [x] 7.5 usageApi / userdataApi 封装 + 模块级缓存

### 任务 8：实现前端首页 — 常用工具网格
- [x] 8.1 调用 getTop(6) 渲染"🔥 常用工具"
- [x] 8.2 不足 6 个用未使用工具补位
- [x] 8.3 navigate / openWidgetModal 时自动 record（排除 home/widgets/ranking）

### 任务 9：实现前端天气页
- [x] 9.1 城市查询、历史城市、当前天气 + 3 天预报展示
- [x] 9.2 游客存本地 / 登录存云端
- [x] 9.3 分享天气卡片入口

### 任务 10：实现前端备忘录页
- [x] 10.1 新增 / 编辑 / 删除 / 关键词搜索
- [x] 10.2 游客本地 / 登录云端
- [x] 10.3 分享单条备忘

### 任务 11：实现前端倒计时页（多目标）
- [x] 11.1 列表展示所有倒计时 + 新增/编辑/删除
- [x] 11.2 实时倒计时（天/时/分/秒）
- [x] 11.3 游客本地 / 登录云端
- [x] 11.4 兼容旧的单目标数据

### 任务 12：实现前端工具箱页 — 预设 + 自定义小组件
- [x] 12.1 预设工具网格（9 个）
- [x] 12.2 自定义小组件添加 / 使用 / 删除
- [x] 12.3 三种类型：url 跳转 / 文字内容 / 自定义代码
- [x] 12.4 游客本地 / 登录云端

### 任务 13：实现前端预设小组件
- [x] 13.1 计算器 / 番茄钟 / BMI / 取色器 / 秒表 / 字数统计
- [x] 13.2 随机工具（随机数/抽签/骰子）/ 密码生成器 / 单位换算

### 任务 14：实现前端轻量分享
- [x] 14.1 快照链接生成（URL query params 编码）
- [x] 14.2 快照还原（解析 URL 还原天气/倒计时/备忘/小组件状态）
- [x] 14.3 分享卡片（canvas 绘制 + 二维码 + 保存图片/复制链接）

---

## 二、新增功能（已完成）

### 任务 15：实现后端用户反馈模块 — F-34 / F-35 / F-36
- [x] 15.1 新增 Feedback 模型（type = vote/request、title、description、vote_count、时间戳）
- [x] 15.2 新增 Vote 模型（user_id + feedback_id 唯一约束，实现"每用户每功能限投 1 票"）
- [x] 15.3 创建 routers/feedback.py 蓝图并在 app.py 注册
- [x] 15.4 POST /api/feedback/vote（为功能投票，重复投票返回"您已为该功能投票"，vote_count +1）
- [x] 15.5 POST /api/feedback/request（提交功能需求，1-200 字校验，无需审核提交即入库）
- [x] 15.6 GET /api/feedback/ranking（反馈排行榜：功能受欢迎排行 + 用户需求列表）
- [x] 15.7 所有接口需登录、按 user_id 隔离；预设可投票功能列表初始化

### 任务 16：实现前端用户中心页 — 承载 F-04 / F-05 / F-06 / F-33 入口
- [x] 16.1 新增"我的"导航项与 UserPage 渲染/初始化函数
- [x] 16.2 用户信息区（邮箱显示、has_password 状态）
- [x] 16.3 设置密码入口（调用 /api/auth/set-password；无密码账号提示设置，有密码账号提供修改）
- [x] 16.4 注销账户入口（二次确认，调用 /api/auth/account DELETE，清除本地态）
- [x] 16.5 退出登录入口（调用 /api/auth/logout，清除 token）
- [x] 16.6 常用工具排行区（复用 getTop，展示 Top 列表 + 使用次数）
- [x] 16.7 我的反馈入口（跳转/进入反馈页面）

### 任务 17：实现前端反馈页面 — F-34 / F-35 / F-36 UI
- [x] 17.1 功能投票区（预设功能列表 + 投票按钮 + 已投状态标记）
- [x] 17.2 提交需求表单（标题/描述，1-200 字前端校验）
- [x] 17.3 反馈排行榜（功能票数排行 + 用户需求列表，提交即展示）
- [x] 17.4 封装 feedbackApi（vote / request / ranking）
- [x] 17.5 游客访问时弹出登录引导

### 任务 18：倒计时支持多目标 — F-18（PRD P1）
- [x] 18.1 后端 CountdownTarget 放开 user 唯一约束，改为列表模式
- [x] 18.2 后端新增 GET 列表 / POST 新增 / PUT 编辑 / DELETE 删除单条
- [x] 18.3 前端倒计时页改为列表展示 + 新增/编辑/删除
- [x] 18.4 兼容旧的单目标数据迁移

### 任务 19：全局联调与边界处理
- [x] 19.1 联调反馈模块（投票 / 提交需求 / 排行榜）端到端
- [x] 19.2 联调用户中心（设置密码 / 注销账户 / 退出登录 / 常用排行）
- [x] 19.3 验证反馈输入边界（1-200 字、重复投票提示）
- [x] 19.4 验证数据隔离（反馈/统计按 user_id，禁止越权）
- [x] 19.5 验证游客拦截（反馈/用户中心需登录，弹出登录引导）
- [x] 19.6 验证注销后反馈/统计/个人数据物理删除
- [x] 19.7 天气 API 失败时展示最近缓存结果（当前仅提示重试）

---

## 任务依赖关系

```
任务 3  依赖于 任务 1, 任务 2
任务 4  依赖于 任务 2, 任务 3
任务 5  依赖于 任务 2, 任务 3
任务 15 依赖于 任务 2, 任务 3
任务 16 依赖于 任务 7, 任务 5, 任务 15
任务 17 依赖于 任务 15, 任务 7
任务 18 依赖于 任务 4, 任务 11
任务 19 依赖于 任务 15, 任务 16, 任务 17, 任务 18
```

---

## 备注

- 任务 1-14 已在 utility-station 中实现，此处仅作记录，无需重复开发。
- P2 功能"明信片式分享"（F-31）本期不实现前端，后端预留接口，未列入任务。
- 全部任务（1-19）已在 utility-station-main/ 中实现并验证完成。
