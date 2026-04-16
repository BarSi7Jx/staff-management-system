"""
Занятие 15. Финальная версия сервера Flask.
Исправлена конфигурация CORS и добавлена надежная инициализация структуры БД.
"""
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import psycopg2
from psycopg2.extras import RealDictCursor
import os

app = Flask(__name__, static_folder='../client')

# Настройка CORS: разрешаем запросы для разработки
CORS(app)

# Параметры подключения к БД
DB_CONFIG = {
    "host": "127.0.0.1",
    "database": "company_db",
    "user": "postgres",
    "password": "123",
}

def get_db():
    try:
        conn_str = f"host='{DB_CONFIG['host']}' dbname='{DB_CONFIG['database']}' user='{DB_CONFIG['user']}' password='{DB_CONFIG['password']}' client_encoding='UTF8'"
        return psycopg2.connect(conn_str, cursor_factory=RealDictCursor)
    except Exception as e:
        print(f"Ошибка подключения к PostgreSQL: {e}")
        return None

def init_db():
    """Инициализация таблиц и проверка наличия колонок (решение ошибок UndefinedColumn)."""
    conn = get_db()
    if not conn: return
    cur = conn.cursor()
    try:
        # Создание базовых таблиц
        cur.execute("CREATE TABLE IF NOT EXISTS departments (id SERIAL PRIMARY KEY, name VARCHAR(100))")
        cur.execute("CREATE TABLE IF NOT EXISTS positions (id SERIAL PRIMARY KEY, name VARCHAR(100))")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS employees (
                id SERIAL PRIMARY KEY,
                last_name VARCHAR(100) NOT NULL,
                first_name VARCHAR(100),
                email VARCHAR(150),
                department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
                position_id INTEGER REFERENCES positions(id) ON DELETE SET NULL
            )
        """)
        
        # Проверка структуры (на случай, если колонки назывались иначе)
        for table in ['departments', 'positions']:
            cur.execute(f"SELECT column_name FROM information_schema.columns WHERE table_name='{table}' AND column_name='name'")
            if not cur.fetchone():
                print(f"Добавляем отсутствующую колонку 'name' в таблицу {table}")
                cur.execute(f"ALTER TABLE {table} ADD COLUMN name VARCHAR(100)")

        # Наполнение справочников тестовыми данными, если они пусты
        cur.execute("SELECT COUNT(*) FROM departments")
        if cur.fetchone()['count'] == 0:
            cur.execute("INSERT INTO departments (name) VALUES ('IT-отдел'), ('Бухгалтерия'), ('Маркетинг')")
            
        cur.execute("SELECT COUNT(*) FROM positions")
        if cur.fetchone()['count'] == 0:
            cur.execute("INSERT INTO positions (name) VALUES ('Разработчик'), ('Главный бухгалтер'), ('Менеджер')")

        conn.commit()
        print("База данных успешно инициализирована.")
    except Exception as e:
        print(f"Ошибка при настройке БД: {e}")
        conn.rollback()
    finally:
        cur.close(); conn.close()

# ========== МАРШРУТЫ ==========

@app.route('/')
def index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def static_proxy(path):
    return send_from_directory(app.static_folder, path)

@app.route("/api/departments", methods=["GET"])
def get_departments():
    conn = get_db()
    if not conn: return jsonify([])
    cur = conn.cursor()
    cur.execute("SELECT id, name FROM departments ORDER BY name")
    rows = cur.fetchall()
    cur.close(); conn.close()
    return jsonify(rows)

@app.route("/api/positions", methods=["GET"])
def get_positions():
    conn = get_db()
    if not conn: return jsonify([])
    cur = conn.cursor()
    cur.execute("SELECT id, name FROM positions ORDER BY name")
    rows = cur.fetchall()
    cur.close(); conn.close()
    return jsonify(rows)

@app.route("/api/employees", methods=["GET"])
def get_employees():
    conn = get_db()
    if not conn: return jsonify([])
    cur = conn.cursor()
    cur.execute("""
        SELECT e.*, d.name as department_name, p.name as position_name
        FROM employees e
        LEFT JOIN departments d ON e.department_id = d.id
        LEFT JOIN positions p ON e.position_id = p.id
        ORDER BY e.id DESC
    """)
    res = cur.fetchall()
    cur.close(); conn.close()
    return jsonify(res)

@app.route("/api/employees/<int:id>", methods=["GET"])
def get_employee(id):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM employees WHERE id = %s", (id,))
    res = cur.fetchone()
    cur.close(); conn.close()
    return jsonify(res) if res else (jsonify({"error": "not found"}), 404)

@app.route("/api/employees", methods=["POST"])
def add_employee():
    data = request.json
    if not data or not data.get('last_name'):
        return jsonify({"error": "Фамилия обязательна"}), 400
    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute("""
            INSERT INTO employees (last_name, first_name, email, department_id, position_id)
            VALUES (%s, %s, %s, %s, %s) RETURNING id
        """, (data['last_name'], data.get('first_name'), data.get('email'), 
              data.get('department_id'), data.get('position_id')))
        new_id = cur.fetchone()['id']
        conn.commit()
        return jsonify({"id": new_id}), 201
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close(); conn.close()

@app.route("/api/employees/<int:id>", methods=["PUT"])
def update_employee(id):
    data = request.json
    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute("""
            UPDATE employees 
            SET last_name=%s, first_name=%s, email=%s, department_id=%s, position_id=%s
            WHERE id=%s
        """, (data['last_name'], data.get('first_name'), data.get('email'), 
              data.get('department_id'), data.get('position_id'), id))
        conn.commit()
        return jsonify({"status": "updated"})
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close(); conn.close()

@app.route("/api/employees/<int:id>", methods=["DELETE"])
def delete_employee(id):
    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute("DELETE FROM employees WHERE id = %s", (id,))
        conn.commit()
        return jsonify({"status": "ok"})
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close(); conn.close()

if __name__ == "__main__":
    init_db()
    app.run(debug=True, port=5000)