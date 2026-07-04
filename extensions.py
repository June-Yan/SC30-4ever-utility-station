"""Flask 扩展实例（统一管理，避免循环导入）"""

from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

limiter = Limiter(
    get_remote_address,
    storage_uri="memory://",
)
