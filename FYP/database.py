import psycopg2
from psycopg2.extras import RealDictCursor
import datetime
import os

# 数据库连接配置 (Supabase Connection Pooler)
DB_HOST = "aws-1-ap-southeast-1.pooler.supabase.com"
DB_NAME = "postgres"
DB_USER = "postgres.ylpzdegpjbkrhfbqcbvc"
DB_PASS = "Danta0902%4012"
DB_PORT = "6543"

DB_URL = f"postgresql://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
DB_SSL_MODE = "require"

def get_db_connection():
    try:
        conn = psycopg2.connect(DB_URL, sslmode=DB_SSL_MODE)
        return conn
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return None

def init_db():
    """初始化数据库表"""
    print("🔄 Connecting to Supabase...")
    conn = get_db_connection()
    if conn:
        print("✅ Connected successfully")
        conn.close()

# --- 核心新增功能：获取职位列表 (支持搜索) ---
def get_jobs(limit=50, location=None, min_salary=None, category=None):
    try:
        conn = get_db_connection()
        if conn is None: return []
        
        # 基础查询
        query = "SELECT * FROM jobs WHERE 1=1"
        params = []
        
        # 动态添加筛选条件
        if location and location.strip():
            query += " AND location ILIKE %s" # ILIKE 不区分大小写
            params.append(f"%{location.strip()}%")
            
        if category and category.strip():
            query += " AND category ILIKE %s"
            params.append(f"%{category.strip()}%")
            
        if min_salary and min_salary.strip():
            # 简单的模糊匹配薪资
            query += " AND salary_range LIKE %s"
            params.append(f"%{min_salary.strip()}%")
            
        query += " ORDER BY id DESC LIMIT %s"
        params.append(limit)
        
        c = conn.cursor(cursor_factory=RealDictCursor)
        c.execute(query, tuple(params))
        rows = c.fetchall()
        conn.close()
        
        # 转换结果为字典列表
        result = []
        for row in rows:
            result.append(dict(row))
            
        return result
    except Exception as e:
        print(f"⚠️ Get jobs failed: {e}")
        return []

# --- 聊天记录相关 (保持不变) ---
def save_message(role, content):
    try:
        conn = get_db_connection()
        if conn is None: return
        c = conn.cursor()
        c.execute('INSERT INTO messages (role, content) VALUES (%s, %s)', (role, content))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"⚠️ Save message failed: {e}")

def get_history(limit=50):
    try:
        conn = get_db_connection()
        if conn is None: return []
        c = conn.cursor(cursor_factory=RealDictCursor)
        c.execute('SELECT role, content, timestamp FROM messages ORDER BY timestamp ASC LIMIT %s', (limit,))
        rows = c.fetchall()
        conn.close()
        result = []
        for row in rows:
            row_dict = dict(row)
            if row_dict.get('timestamp'):
                row_dict['timestamp'] = row_dict['timestamp'].isoformat()
            result.append(row_dict)
        return result
    except Exception as e:
        print(f"⚠️ Get history failed: {e}")
        return []

def clear_history():
    try:
        conn = get_db_connection()
        if conn is None: return
        c = conn.cursor()
        c.execute('DELETE FROM messages')
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"⚠️ Clear history failed: {e}")

# 启动时测试连接
init_db()

# --- 新增：获取单个职位详情 ---
def get_job_by_id(job_id):
    try:
        conn = get_db_connection()
        if conn is None: return None
        c = conn.cursor(cursor_factory=RealDictCursor)
        c.execute("SELECT * FROM jobs WHERE id = %s", (job_id,))
        row = c.fetchone()
        conn.close()
        return dict(row) if row else None
    except Exception as e:
        print(f"⚠️ Get job by id failed: {e}")
        return None

# --- 新增：申请职位相关 ---
def init_application_table():
    try:
        conn = get_db_connection()
        if conn is None: return
        c = conn.cursor()
        c.execute("""
            CREATE TABLE IF NOT EXISTS applications (
                id SERIAL PRIMARY KEY,
                job_id INTEGER REFERENCES jobs(id),
                name TEXT NOT NULL,
                email TEXT NOT NULL,
                message TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        """)
        conn.commit()
        conn.close()
        print("✅ Table 'applications' ensured.")
    except Exception as e:
        print(f"⚠️ Init application table failed: {e}")

def apply_for_job(job_id, name, email, message):
    try:
        conn = get_db_connection()
        if conn is None: return False
        c = conn.cursor()
        c.execute(
            "INSERT INTO applications (job_id, name, email, message) VALUES (%s, %s, %s, %s)",
            (job_id, name, email, message)
        )
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print(f"⚠️ Apply job failed: {e}")
        return False

# 每次启动时尝试初始化新表
init_application_table()

# --- 新增：HR 发布职位 ---
def create_job(title, company, salary, category, location, requirements):
    try:
        conn = get_db_connection()
        if conn is None: return False
        c = conn.cursor()
        c.execute(
            """
            INSERT INTO jobs (title, company, salary_range, category, location, requirements, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, NOW())
            RETURNING id
            """,
            (title, company, salary, category, location, requirements)
        )
        new_id = c.fetchone()[0]
        conn.commit()
        conn.close()
        return new_id
    except Exception as e:
        print(f"⚠️ Create job failed: {e}")
        return None
