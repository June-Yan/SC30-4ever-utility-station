"""实用工具聚合站 — Flask 主应用（路由注册、天气 API 代理、频率限制）"""

import os
import flask
import requests
import datetime
import socket
from database import db, init_app
from extensions import limiter
from routers.auth import bp as auth_bp
from routers.usage import bp as usage_bp
from routers.userdata import bp as userdata_bp
from routers.workshop import bp as workshop_bp
from routers.feedback import bp as feedback_bp
from routers.search import bp as search_bp
from routers.admin import bp as admin_bp
from routers.rating import bp as rating_bp
from routers.stats import bp as stats_bp

app = flask.Flask(__name__, static_folder='static', template_folder='templates')
init_app(app)

# 频率限制：基于 IP 地址，默认 60/分钟
limiter.init_app(app)
limiter._default_limits = ["60 per minute"]

app.register_blueprint(auth_bp)
app.register_blueprint(usage_bp)
app.register_blueprint(userdata_bp)
app.register_blueprint(workshop_bp)
app.register_blueprint(feedback_bp)
app.register_blueprint(search_bp)
app.register_blueprint(admin_bp)
app.register_blueprint(rating_bp)
app.register_blueprint(stats_bp)


def get_lan_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(('8.8.8.8', 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return '127.0.0.1'


WEATHER_API = 'https://wttr.in'


@app.route('/')
def index():
    return flask.render_template('index.html', lan_ip=get_lan_ip())


@app.route('/api/weather')
def get_weather():
    city = flask.request.args.get('city', '').strip()
    if not city:
        return flask.jsonify({'success': False, 'error': '请输入城市名称'})

    try:
        resp = requests.get(
            f'{WEATHER_API}/{city}',
            params={'format': 'j1'},
            timeout=5
        )
        if resp.status_code != 200:
            return flask.jsonify({'success': False, 'error': '未查询到该城市，请重新输入'})

        data = resp.json()
        current = data.get('current_condition', [{}])[0]
        forecast_list = data.get('weather', [])

        weather_icons = {
            'Sunny': '☀️', 'Clear': '🌙', 'Partly cloudy': '⛅',
            'Cloudy': '☁️', 'Overcast': '☁️', 'Mist': '🌫️',
            'Fog': '🌫️', 'Light rain': '🌦️', 'Moderate rain': '🌧️',
            'Heavy rain': '⛈️', 'Light snow': '🌨️', 'Moderate snow': '❄️',
            'Heavy snow': '❄️', 'Thunderstorm': '⛈️', 'Patchy rain': '🌦️',
            'Patchy snow': '🌨️', 'rain': '🌧️', 'snow': '❄️', 'drizzle': '🌦️',
            'Freezing': '🥶', 'Blizzard': '🌨️', 'cloudy': '☁️',
        }

        weather_zh = {
            'Sunny': '晴', 'Clear': '晴', 'Partly cloudy': '多云',
            'Cloudy': '阴', 'Overcast': '阴天', 'Mist': '薄雾',
            'Fog': '雾', 'Light rain': '小雨', 'Moderate rain': '中雨',
            'Heavy rain': '大雨', 'Light snow': '小雪', 'Moderate snow': '中雪',
            'Heavy snow': '大雪', 'Thunderstorm': '雷暴', 'Patchy rain': '零星小雨',
            'Patchy snow': '零星小雪', 'drizzle': '毛毛雨', 'Blizzard': '暴风雪',
            'Freezing': '冰冻', 'Thundery outbreaks': '雷阵雨',
        }

        def get_icon(desc):
            lower = desc.lower()
            for key, icon in weather_icons.items():
                if key.lower() in lower:
                    return icon
            if 'rain' in lower: return '🌧️'
            if 'snow' in lower: return '❄️'
            if 'cloud' in lower: return '☁️'
            return '🌡️'

        def get_zh(desc, lang_zh_val=''):
            lower = desc.lower()
            for key, zh in weather_zh.items():
                if key.lower() in lower:
                    return zh
            if lang_zh_val:
                return lang_zh_val
            return desc

        desc_en = current.get('weatherDesc', [{}])[0].get('value', '')
        result = {
            'success': True,
            'data': {
                'city': city,
                'current': {
                    'temp': int(current.get('temp_C', 0)),
                    'feelsLike': int(current.get('FeelsLikeC', 0)),
                    'humidity': int(current.get('humidity', 0)),
                    'windDir': current.get('winddir16Point', ''),
                    'windSpeed': current.get('windspeedKmph', '') + ' km/h',
                    'description': get_zh(desc_en, current.get('lang_zh', [{}])[0].get('value', '')),
                    'icon': get_icon(desc_en),
                },
                'forecast': []
            }
        }

        for day in forecast_list[:3]:
            hourly = day.get('hourly', [{}])
            mid = hourly[4] if len(hourly) > 4 else hourly[-1] if hourly else {}
            f_desc_en = mid.get('weatherDesc', [{}])[0].get('value', '')
            f_lang_zh = mid.get('lang_zh', [{}])[0].get('value', '')
            result['data']['forecast'].append({
                'date': day.get('date', ''),
                'maxTemp': int(day.get('maxtempC', 0)),
                'minTemp': int(day.get('mintempC', 0)),
                'description': get_zh(f_desc_en, f_lang_zh),
                'icon': get_icon(f_desc_en),
                'precipitation': mid.get('chanceofrain', '0') + '%',
            })

        return flask.jsonify(result)

    except requests.Timeout:
        return flask.jsonify({'success': False, 'error': '网络超时，请稍后重试'})
    except requests.RequestException:
        return flask.jsonify({'success': False, 'error': '网络异常，请稍后重试'})
    except Exception as e:
        return flask.jsonify({'success': False, 'error': '查询失败，请稍后重试'})


if __name__ == '__main__':
    import os
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
