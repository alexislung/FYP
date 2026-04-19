import psycopg2
from psycopg2.extras import RealDictCursor
import os
import re
import json
import traceback
from pathlib import Path

try:
    from dotenv import load_dotenv
    _ext = (os.environ.get("EASYJOB_ENV_FILE") or "").strip()
    if _ext:
        _pp = Path(_ext)
        if _pp.is_file():
            load_dotenv(_pp, override=False)
    load_dotenv(Path(__file__).resolve().parent / ".env", override=False)
except ImportError:
    pass

DB_HOST = os.environ.get("DB_HOST", "").strip()
DB_NAME = os.environ.get("DB_NAME", "").strip()
DB_USER = os.environ.get("DB_USER", "").strip()
DB_PASS = os.environ.get("DB_PASS", "").strip()
DB_PORT = os.environ.get("DB_PORT", "").strip()
DB_URL = os.environ.get("DATABASE_URL", "").strip()
DB_SSL_MODE = (os.environ.get("DB_SSL_MODE", "require") or "require").strip()

if not DB_URL and all([DB_HOST, DB_NAME, DB_USER, DB_PASS, DB_PORT]):
    DB_URL = f"postgresql://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

try:
    import local_keys as _local_keys
    if not DB_URL:
        _lu = getattr(_local_keys, "DATABASE_URL", None)
        if _lu and str(_lu).strip():
            DB_URL = str(_lu).strip()
    if not os.environ.get("DB_SSL_MODE", "").strip():
        _ls = getattr(_local_keys, "DB_SSL_MODE", None)
        if _ls and str(_ls).strip():
            DB_SSL_MODE = str(_ls).strip()
except ImportError:
    pass

def get_db_connection():
    try:
        if not DB_URL:
            print("Database connection failed: DATABASE_URL is not configured")
            return None
        try:
            timeout_s = int(os.environ.get("DB_CONNECT_TIMEOUT", "15") or "15")
        except ValueError:
            timeout_s = 15
        conn = psycopg2.connect(
            DB_URL,
            sslmode=DB_SSL_MODE,
            connect_timeout=timeout_s,
        )
        return conn
    except Exception as e:
        print("Database connection failed:", e)
        traceback.print_exc()
        return None

def init_db():
    conn = get_db_connection()
    if conn:
        print("Database connection OK")
        conn.close()


def is_database_url_configured():
    if (DB_URL or "").strip():
        return True
    return all([DB_HOST, DB_NAME, DB_USER, DB_PASS, DB_PORT])


def init_jobs_table():
    try:
        conn = get_db_connection()
        if conn is None:
            return
        c = conn.cursor()
        c.execute(
            """
            CREATE TABLE IF NOT EXISTS jobs (
                id SERIAL PRIMARY KEY,
                title TEXT NOT NULL,
                company TEXT NOT NULL,
                salary_range TEXT,
                category TEXT,
                location TEXT,
                requirements TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            """
        )
        conn.commit()
        c.execute("SELECT COUNT(*) FROM jobs")
        n = c.fetchone()[0]
        if n == 0:
            demos = [
                (
                    "Frontend Developer",
                    "Harbour Digital",
                    "$28K - 38K",
                    "Technology & IT",
                    "Hong Kong",
                    "React, HTML/CSS, REST APIs, Git.",
                ),
                (
                    "Financial Analyst",
                    "Metro Finance Ltd",
                    "Negotiable",
                    "Finance & Accounting",
                    "Central, Hong Kong",
                    "Excel, financial modelling, reporting.",
                ),
                (
                    "Marketing Executive",
                    "BrightWave Agency",
                    "22K-30K",
                    "Marketing & Sales",
                    "Kowloon",
                    "Social media, campaigns, basic analytics.",
                ),
                (
                    "Graduate Engineer",
                    "Skyline Infrastructure",
                    "45000-52000",
                    "Engineering",
                    "Hong Kong",
                    "Site visits, AutoCAD, teamwork.",
                ),
                (
                    "HR Officer",
                    "United Services Co.",
                    "Part-time 18K",
                    "Human Resources",
                    "Hybrid",
                    "Recruitment admin, interviews, onboarding.",
                ),
            ]
            for row in demos:
                c.execute(
                    """
                    INSERT INTO jobs (title, company, salary_range, category, location, requirements)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    """,
                    row,
                )
            conn.commit()
            print(f"Seeded {len(demos)} demo jobs (jobs table was empty).")
        conn.close()
    except Exception as e:
        print(f"init_jobs_table failed: {e}")
        traceback.print_exc()

def _extract_salary_k_range(text):
    s = (text or "").lower()
    nums = []
    for m in re.findall(r"(\d+(?:\.\d+)?)\s*k", s):
        try:
            nums.append(float(m))
        except Exception:
            pass
    if not nums:
        for m in re.findall(r"(\d{5,6})", s):
            try:
                nums.append(float(m) / 1000.0)
            except Exception:
                pass
    if not nums:
        return (None, None)
    if len(nums) == 1:
        return (nums[0], nums[0])
    return (min(nums), max(nums))

def _match_job_type(job, selected_types):
    if not selected_types:
        return True
    haystack = (
        f"{job.get('title', '')} {job.get('requirements', '')} {job.get('category', '')}"
    ).lower()
    mapping = {
        "full time": ["full-time", "full time", "permanent"],
        "part time": ["part-time", "part time"],
        "contract/temp": ["contract", "temp", "temporary", "fixed-term"],
        "casual/vacation": ["casual", "vacation", "seasonal"]
    }
    for t in selected_types:
        keys = mapping.get((t or "").strip().lower(), [])
        if any(k in haystack for k in keys):
            return True
    return False

def get_jobs(limit=50, q=None, location=None, min_salary=None, category=None, job_types=None, min_k=None, max_k=None, posted_days=None):
    try:
        conn = get_db_connection()
        if conn is None: return []
        
        query = "SELECT * FROM jobs WHERE 1=1"
        params = []
        
        if q and q.strip():
            query += " AND (title ILIKE %s OR company ILIKE %s OR requirements ILIKE %s)"
            like = f"%{q.strip()}%"
            params.extend([like, like, like])

        if location and location.strip():
            query += " AND location ILIKE %s"
            params.append(f"%{location.strip()}%")
            
        if category and category.strip():
            query += " AND category ILIKE %s"
            params.append(f"%{category.strip()}%")
            
        if min_salary and min_salary.strip():
            query += " AND salary_range LIKE %s"
            params.append(f"%{min_salary.strip()}%")

        if posted_days:
            try:
                days = int(str(posted_days).strip())
                if days > 0:
                    query += " AND created_at >= (NOW() - (%s || ' days')::interval)"
                    params.append(str(days))
            except Exception:
                pass
            
        query += " ORDER BY id DESC LIMIT %s"
        params.append(limit)
        
        c = conn.cursor(cursor_factory=RealDictCursor)
        c.execute(query, tuple(params))
        rows = c.fetchall()
        conn.close()
        
        result = []
        min_k_num = None
        max_k_num = None
        try:
            if min_k is not None and str(min_k).strip() != "":
                min_k_num = float(min_k)
        except Exception:
            min_k_num = None
        try:
            if max_k is not None and str(max_k).strip() != "":
                max_k_num = float(max_k)
        except Exception:
            max_k_num = None

        selected_types = [t.strip() for t in (job_types or []) if t and str(t).strip()]
        eff_min_k = min_k_num
        eff_max_k = max_k_num
        if eff_min_k is not None and eff_min_k <= 0:
            eff_min_k = None
        if eff_max_k is not None and eff_max_k >= 120:
            eff_max_k = None

        for row in rows:
            job = dict(row)

            if selected_types and (not _match_job_type(job, selected_types)):
                continue

            if eff_min_k is not None or eff_max_k is not None:
                low, high = _extract_salary_k_range(job.get("salary_range"))
                if low is None and high is None:
                    pass
                else:
                    if eff_min_k is not None and high is not None and high < eff_min_k:
                        continue
                    if eff_max_k is not None and low is not None and low > eff_max_k:
                        continue

            result.append(job)
            
        return result
    except Exception as e:
        print(f"Get jobs failed: {e}")
        traceback.print_exc()
        return []

def init_messages_table():
    try:
        conn = get_db_connection()
        if conn is None: return
        c = conn.cursor()
        c.execute("""
            CREATE TABLE IF NOT EXISTS messages (
                id SERIAL PRIMARY KEY,
                user_id TEXT NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        """)
        c.execute("ALTER TABLE messages ADD COLUMN IF NOT EXISTS user_id TEXT")
        c.execute("CREATE INDEX IF NOT EXISTS idx_messages_user_time ON messages (user_id, timestamp)")
        conn.commit()
        conn.close()
        print("messages table OK")
    except Exception as e:
        print(f"Init messages table failed: {e}")

def save_message(user_id, role, content):
    try:
        if not user_id:
            return
        conn = get_db_connection()
        if conn is None: return
        c = conn.cursor()
        c.execute('INSERT INTO messages (user_id, role, content) VALUES (%s, %s, %s)', (user_id, role, content))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Save message failed: {e}")

def get_history(user_id, limit=50):
    try:
        if not user_id:
            return []
        conn = get_db_connection()
        if conn is None: return []
        c = conn.cursor(cursor_factory=RealDictCursor)
        c.execute(
            'SELECT role, content, timestamp FROM messages WHERE user_id = %s ORDER BY timestamp ASC LIMIT %s',
            (user_id, limit)
        )
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
        print(f"Get history failed: {e}")
        return []

def clear_history(user_id):
    try:
        if not user_id:
            return
        conn = get_db_connection()
        if conn is None: return
        c = conn.cursor()
        c.execute('DELETE FROM messages WHERE user_id = %s', (user_id,))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Clear history failed: {e}")

init_db()
init_jobs_table()
init_messages_table()

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
        print(f"Get job by id failed: {e}")
        return None

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
        print("applications table OK")
    except Exception as e:
        print(f"Init application table failed: {e}")

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
        print(f"Apply job failed: {e}")
        return False

init_application_table()

def init_quiz_results_table():
    try:
        conn = get_db_connection()
        if conn is None: return
        c = conn.cursor()
        c.execute("""
            CREATE TABLE IF NOT EXISTS quiz_results (
                id SERIAL PRIMARY KEY,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                answers_json JSONB NOT NULL,
                report_text TEXT,
                report_model TEXT,
                report_status TEXT DEFAULT 'completed'
            );
        """)
        conn.commit()
        conn.close()
        print("quiz_results table OK")
    except Exception as e:
        print(f"Init quiz results table failed: {e}")

def save_quiz_result(answers, report_text=None, report_model=None, report_status='completed'):
    try:
        conn = get_db_connection()
        if conn is None: return None
        c = conn.cursor()
        answers_payload = json.dumps(answers or {})
        c.execute(
            """
            INSERT INTO quiz_results (answers_json, report_text, report_model, report_status)
            VALUES (%s::jsonb, %s, %s, %s)
            RETURNING id
            """,
            (answers_payload, report_text, report_model, report_status)
        )
        new_id = c.fetchone()[0]
        conn.commit()
        conn.close()
        return new_id
    except Exception as e:
        print(f"Save quiz result failed: {e}")
        return None

def get_quiz_results(limit=20):
    try:
        conn = get_db_connection()
        if conn is None: return []
        c = conn.cursor(cursor_factory=RealDictCursor)
        c.execute(
            """
            SELECT id, created_at, report_model, report_status, report_text
            FROM quiz_results
            ORDER BY created_at DESC
            LIMIT %s
            """,
            (limit,)
        )
        rows = c.fetchall()
        conn.close()
        result = []
        for row in rows:
            row_dict = dict(row)
            if row_dict.get('created_at'):
                row_dict['created_at'] = row_dict['created_at'].isoformat()
            result.append(row_dict)
        return result
    except Exception as e:
        print(f"Get quiz results failed: {e}")
        return []

def get_quiz_result_by_id(result_id):
    try:
        conn = get_db_connection()
        if conn is None: return None
        c = conn.cursor(cursor_factory=RealDictCursor)
        c.execute(
            """
            SELECT id, created_at, answers_json, report_text, report_model, report_status
            FROM quiz_results
            WHERE id = %s
            """,
            (result_id,)
        )
        row = c.fetchone()
        conn.close()
        if not row:
            return None
        result = dict(row)
        if result.get('created_at'):
            result['created_at'] = result['created_at'].isoformat()
        return result
    except Exception as e:
        print(f"Get quiz result by id failed: {e}")
        return None

init_quiz_results_table()

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
        print(f"Create job failed: {e}")
        return None
