
import datetime
import json
import os
import re
import traceback
import uuid
from decimal import Decimal
from pathlib import Path
from urllib.parse import quote_plus, urlparse, unquote, urlunparse

import psycopg2
from psycopg2.extras import RealDictCursor

try:
    from dotenv import load_dotenv
    _ext = (os.environ.get("EASYJOB_ENV_FILE") or "").strip()
    if _ext and Path(_ext).is_file():
        load_dotenv(_ext, override=False)
    load_dotenv(Path(__file__).resolve().parent / ".env", override=False)
except ImportError:
    pass

_DEFAULT_DATABASE_URL = (
    "postgresql://postgres.ylpzdegpjbkrhfbqcbvc:iSPF6SzvdgUtE1M7@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres"
)
_DEFAULT_DB_SSL_MODE = "require"

DB_HOST = os.environ.get("DB_HOST", "").strip()
DB_NAME = os.environ.get("DB_NAME", "").strip()
DB_USER = os.environ.get("DB_USER", "").strip()
DB_PASS = os.environ.get("DB_PASS", "").strip()
DB_PORT = os.environ.get("DB_PORT", "").strip()
DB_URL = os.environ.get("DATABASE_URL", "").strip()
DB_SSL_MODE = (os.environ.get("DB_SSL_MODE", "prefer") or "prefer").strip()

if not DB_URL and all([DB_HOST, DB_NAME, DB_USER, DB_PASS, DB_PORT]):
    DB_URL = f"postgresql://{quote_plus(DB_USER)}:{quote_plus(DB_PASS)}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
if not (DB_URL or "").strip() and (_DEFAULT_DATABASE_URL or "").strip():
    DB_URL = (_DEFAULT_DATABASE_URL or "").strip()
if not os.environ.get("DB_SSL_MODE", "").strip() and (_DEFAULT_DB_SSL_MODE or "").strip():
    DB_SSL_MODE = (_DEFAULT_DB_SSL_MODE or "").strip()
if (_DEFAULT_DATABASE_URL or "").strip():
    DB_URL = (_DEFAULT_DATABASE_URL or "").strip()
    if not os.environ.get("DB_SSL_MODE", "").strip() and (_DEFAULT_DB_SSL_MODE or "").strip():
        DB_SSL_MODE = (_DEFAULT_DB_SSL_MODE or "").strip()


def is_database_url_configured():
    return bool((DB_URL or "").strip()) or all([DB_HOST, DB_NAME, DB_USER, DB_PASS, DB_PORT])


def sanitize_row_for_json(row):
    if row is None:
        return None
    out = {}
    for k, v in dict(row).items():
        if isinstance(v, datetime.datetime):
            out[k] = v.isoformat()
        elif isinstance(v, datetime.date):
            out[k] = v.isoformat()
        elif isinstance(v, Decimal):
            out[k] = float(v)
        elif isinstance(v, uuid.UUID):
            out[k] = str(v)
        elif isinstance(v, (bytes, memoryview)):
            out[k] = bytes(v).decode("utf-8", errors="replace")
        elif isinstance(v, dict):
            out[k] = v
        elif isinstance(v, list):
            out[k] = v
        else:
            out[k] = v
    return out


def _supabase_try_transaction_port(url):
    """Same host as direct, port 6543 — Supabase transaction pooler (IPv4-friendly)."""
    try:
        u = urlparse(url)
        if not u.hostname or "supabase.co" not in u.hostname:
            return None
        if not u.hostname.startswith("db."):
            return None
        if (u.port or 5432) != 5432:
            return None
        auth = ""
        if u.username:
            auth = quote_plus(u.username)
            if u.password is not None:
                auth += ":" + quote_plus(u.password)
            auth += "@"
        netloc = f"{auth}{u.hostname}:6543"
        return urlunparse((u.scheme or "postgresql", netloc, u.path or "/postgres", "", "", ""))
    except Exception:
        return None


def _is_dns_resolution_error(err):
    s = str(err).lower()
    return (
        "could not translate host name" in s
        or "name or service not known" in s
        or "getaddrinfo" in s
        or "無法識別" in str(err)
    )


def _resolve_hostname_via_public_dns(hostname):
    """Ask public DNS directly (bypass router). Prefer IPv4 — many home networks have broken IPv6."""
    if not hostname:
        return []
    try:
        import dns.resolver
    except ImportError:
        print("Database: pip install dnspython  (needed when router DNS fails)")
        return []
    v4, v6 = [], []
    for ns in ("8.8.8.8", "8.8.4.4", "1.1.1.1", "9.9.9.9"):
        r = dns.resolver.Resolver(configure=False)
        r.nameservers = [ns]
        r.timeout = 3
        r.lifetime = 6
        try:
            for rr in r.resolve(hostname, "A"):
                if rr.address not in v4:
                    v4.append(rr.address)
        except Exception:
            pass
        if v4:
            break
    if not v4:
        r = dns.resolver.Resolver(configure=False)
        r.nameservers = ["8.8.8.8", "1.1.1.1"]
        r.timeout = 3
        r.lifetime = 6
        try:
            for rr in r.resolve(hostname, "AAAA"):
                if rr.address not in v6:
                    v6.append(rr.address)
        except Exception:
            pass
    return v4 + v6


def _connect_hostaddr(db_url, sslm, timeout_s):
    u = urlparse(db_url)
    host = u.hostname
    if not host:
        return None
    ips = _resolve_hostname_via_public_dns(host)
    if not ips:
        return None
    port = u.port or 5432
    user = unquote(u.username or "")
    password = unquote(u.password or "")
    dbname = (u.path or "/").lstrip("/") or "postgres"
    if ips and all(":" in x for x in ips):
        print(
            "Database: this host has only IPv6 from DNS; your network cannot reach it. "
            "Use Supabase → Database → Transaction pooler URI (port 6543) in database.py."
        )
    last = None
    for ip in ips:
        try:
            return psycopg2.connect(
                dbname=dbname,
                user=user,
                password=password,
                port=port,
                host=host,
                hostaddr=ip,
                sslmode=sslm,
                connect_timeout=timeout_s,
            )
        except Exception as e:
            last = e
    if last:
        print("Database hostaddr attempts:", last)
    return None


def _connect_url_attempt(url, ssl_modes, timeout_s):
    last_err = None
    for sslm in ssl_modes:
        try:
            conn = psycopg2.connect(url, sslmode=sslm, connect_timeout=timeout_s)
            return conn, None
        except Exception as e:
            last_err = e
    if last_err and _is_dns_resolution_error(last_err):
        print("Database: using public DNS (8.8.8.8) + hostaddr…")
        for sslm in ssl_modes:
            c = _connect_hostaddr(url, sslm, timeout_s)
            if c:
                print("Database: connected (hostaddr fallback)")
                return c, None
    return None, last_err


def get_db_connection():
    if not DB_URL:
        print("Database: no URL — set DATABASE_URL or _DEFAULT_DATABASE_URL in database.py")
        return None
    try:
        timeout_s = int(os.environ.get("DB_CONNECT_TIMEOUT", "15") or "15")
    except ValueError:
        timeout_s = 15
    ssl_modes = []
    for m in (DB_SSL_MODE, "require", "prefer", "allow"):
        m = (m or "").strip()
        if m and m not in ssl_modes:
            ssl_modes.append(m)

    conn, last_err = _connect_url_attempt(DB_URL, ssl_modes, timeout_s)
    if conn:
        return conn

    alt = _supabase_try_transaction_port(DB_URL)
    if alt and alt != DB_URL:
        print("Database: retrying with Supabase transaction pooler (port 6543)…")
        conn, err2 = _connect_url_attempt(alt, ssl_modes, timeout_s)
        if conn:
            print("Database: connected on port 6543")
            return conn
        if err2:
            last_err = err2

    if last_err is not None:
        low = str(last_err).lower()
        if "network is unreachable" in low or "無法識別" in str(last_err) or _is_dns_resolution_error(last_err):
            print(
                "Database: Supabase `db.*` 在你網路上常只有 IPv6。請到後台 Project → Connect → "
                "「Session pooler」複製整條 URI（aws-0-…區域要與專案一致），貼到 database.py 的 _DEFAULT_DATABASE_URL。"
            )
        print("Database connection failed:", last_err)
        traceback.print_exc()
    else:
        print("Database connection failed (no SSL mode to try)")
    return None


def _run_ddl():
    conn = get_db_connection()
    if not conn:
        print("Database: startup skipped (no connection)")
        return
    cur = conn.cursor()
    stmts = [
        """CREATE TABLE IF NOT EXISTS jobs (
            id SERIAL PRIMARY KEY,
            title TEXT NOT NULL,
            company TEXT NOT NULL,
            salary_range TEXT,
            category TEXT,
            location TEXT,
            requirements TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )""",
        """CREATE TABLE IF NOT EXISTS messages (
            id SERIAL PRIMARY KEY,
            user_id TEXT NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            timestamp TIMESTAMPTZ DEFAULT NOW()
        )""",
        # Old DBs may have messages without user_id; CREATE TABLE IF NOT EXISTS does not add columns.
        "ALTER TABLE messages ADD COLUMN IF NOT EXISTS user_id TEXT",
        "CREATE INDEX IF NOT EXISTS idx_messages_user_time ON messages (user_id, timestamp)",
        """CREATE TABLE IF NOT EXISTS applications (
            id SERIAL PRIMARY KEY,
            job_id INTEGER REFERENCES jobs(id),
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            message TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )""",
        """CREATE TABLE IF NOT EXISTS quiz_results (
            id SERIAL PRIMARY KEY,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            answers_json JSONB NOT NULL,
            report_text TEXT,
            report_model TEXT,
            report_status TEXT DEFAULT 'completed'
        )""",
    ]
    for sql in stmts:
        cur.execute(sql)
    conn.commit()
    cur.execute("SELECT COUNT(*) FROM jobs")
    n = cur.fetchone()[0]
    if n == 0:
        demos = [
            ("Frontend Developer", "Harbour Digital", "$28K - 38K", "Technology & IT", "Hong Kong", "React, HTML/CSS, REST APIs, Git."),
            ("Financial Analyst", "Metro Finance Ltd", "Negotiable", "Finance & Accounting", "Central, Hong Kong", "Excel, financial modelling, reporting."),
            ("Marketing Executive", "BrightWave Agency", "22K-30K", "Marketing & Sales", "Kowloon", "Social media, campaigns, basic analytics."),
            ("Graduate Engineer", "Skyline Infrastructure", "45000-52000", "Engineering", "Hong Kong", "Site visits, AutoCAD, teamwork."),
            ("HR Officer", "United Services Co.", "Part-time 18K", "Human Resources", "Hybrid", "Recruitment admin, interviews, onboarding."),
        ]
        for row in demos:
            cur.execute(
                "INSERT INTO jobs (title, company, salary_range, category, location, requirements) VALUES (%s,%s,%s,%s,%s,%s)",
                row,
            )
        conn.commit()
        print(f"Database: seeded {len(demos)} demo jobs")
    cur.close()
    conn.close()
    print("Database: tables ready")


_run_ddl()


def _extract_salary_k_range(text):
    s = (text or "").lower()
    nums = []
    for m in re.findall(r"(\d+(?:\.\d+)?)\s*k", s):
        try:
            nums.append(float(m))
        except ValueError:
            pass
    if not nums:
        for m in re.findall(r"(\d{5,6})", s):
            try:
                nums.append(float(m) / 1000.0)
            except ValueError:
                pass
    if not nums:
        return (None, None)
    if len(nums) == 1:
        return (nums[0], nums[0])
    return (min(nums), max(nums))


def _match_job_type(job, selected_types):
    if not selected_types:
        return True
    hay = f"{job.get('title', '')} {job.get('requirements', '')} {job.get('category', '')}".lower()
    mapping = {
        "full time": ["full-time", "full time", "permanent"],
        "part time": ["part-time", "part time"],
        "contract/temp": ["contract", "temp", "temporary", "fixed-term"],
        "casual/vacation": ["casual", "vacation", "seasonal"],
    }
    for t in selected_types:
        keys = mapping.get((t or "").strip().lower(), [])
        if any(k in hay for k in keys):
            return True
    return False


def get_jobs(limit=50, q=None, location=None, min_salary=None, category=None, job_types=None, min_k=None, max_k=None, posted_days=None):
    conn = get_db_connection()
    if not conn:
        return []
    try:
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
        if min_salary and str(min_salary).strip():
            query += " AND salary_range LIKE %s"
            params.append(f"%{str(min_salary).strip()}%")
        if posted_days:
            try:
                days = int(str(posted_days).strip())
                if days > 0:
                    query += " AND created_at >= (NOW() - (%s || ' days')::interval)"
                    params.append(str(days))
            except ValueError:
                pass
        query += " ORDER BY id DESC LIMIT %s"
        params.append(limit)
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute(query, tuple(params))
        rows = cur.fetchall()
        conn.close()

        min_k_num = max_k_num = None
        try:
            if min_k is not None and str(min_k).strip() != "":
                min_k_num = float(min_k)
        except ValueError:
            pass
        try:
            if max_k is not None and str(max_k).strip() != "":
                max_k_num = float(max_k)
        except ValueError:
            pass
        eff_min = None if (min_k_num is not None and min_k_num <= 0) else min_k_num
        eff_max = None if (max_k_num is not None and max_k_num >= 120) else max_k_num
        types = [t.strip() for t in (job_types or []) if t and str(t).strip()]

        out = []
        for row in rows:
            job = dict(row)
            if types and not _match_job_type(job, types):
                continue
            if eff_min is not None or eff_max is not None:
                low, high = _extract_salary_k_range(job.get("salary_range"))
                if low is not None or high is not None:
                    if eff_min is not None and high is not None and high < eff_min:
                        continue
                    if eff_max is not None and low is not None and low > eff_max:
                        continue
            out.append(sanitize_row_for_json(job))
        return out
    except Exception as e:
        print("get_jobs:", e)
        traceback.print_exc()
        try:
            conn.close()
        except Exception:
            pass
        return []


def get_job_by_id(job_id):
    conn = get_db_connection()
    if not conn:
        return None
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT * FROM jobs WHERE id = %s", (job_id,))
        row = cur.fetchone()
        conn.close()
        return sanitize_row_for_json(row) if row else None
    except Exception as e:
        print("get_job_by_id:", e)
        try:
            conn.close()
        except Exception:
            pass
        return None


def apply_for_job(job_id, name, email, message):
    conn = get_db_connection()
    if not conn:
        return False
    try:
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO applications (job_id, name, email, message) VALUES (%s,%s,%s,%s)",
            (job_id, name, email, message),
        )
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print("apply_for_job:", e)
        try:
            conn.close()
        except Exception:
            pass
        return False


def create_job(title, company, salary, category, location, requirements):
    conn = get_db_connection()
    if not conn:
        return None
    try:
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO jobs (title, company, salary_range, category, location, requirements, created_at)
            VALUES (%s,%s,%s,%s,%s,%s,NOW()) RETURNING id
            """,
            (title, company, salary, category, location, requirements),
        )
        new_id = cur.fetchone()[0]
        conn.commit()
        conn.close()
        return new_id
    except Exception as e:
        print("create_job:", e)
        try:
            conn.close()
        except Exception:
            pass
        return None


def save_quiz_result(answers, report_text=None, report_model=None, report_status="completed"):
    conn = get_db_connection()
    if not conn:
        return None
    try:
        cur = conn.cursor()
        payload = json.dumps(answers or {})
        cur.execute(
            """
            INSERT INTO quiz_results (answers_json, report_text, report_model, report_status)
            VALUES (%s::jsonb, %s, %s, %s) RETURNING id
            """,
            (payload, report_text, report_model, report_status),
        )
        rid = cur.fetchone()[0]
        conn.commit()
        conn.close()
        return rid
    except Exception as e:
        print("save_quiz_result:", e)
        try:
            conn.close()
        except Exception:
            pass
        return None


def get_quiz_results(limit=20):
    conn = get_db_connection()
    if not conn:
        return []
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute(
            """
            SELECT id, created_at, report_model, report_status, report_text
            FROM quiz_results ORDER BY created_at DESC LIMIT %s
            """,
            (limit,),
        )
        rows = cur.fetchall()
        conn.close()
        return [sanitize_row_for_json(dict(r)) for r in rows]
    except Exception as e:
        print("get_quiz_results:", e)
        try:
            conn.close()
        except Exception:
            pass
        return []


def get_quiz_result_by_id(result_id):
    conn = get_db_connection()
    if not conn:
        return None
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute(
            """
            SELECT id, created_at, answers_json, report_text, report_model, report_status
            FROM quiz_results WHERE id = %s
            """,
            (result_id,),
        )
        row = cur.fetchone()
        conn.close()
        return sanitize_row_for_json(dict(row)) if row else None
    except Exception as e:
        print("get_quiz_result_by_id:", e)
        try:
            conn.close()
        except Exception:
            pass
        return None


def save_message(user_id, role, content):
    if not user_id:
        return
    conn = get_db_connection()
    if not conn:
        return
    try:
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO messages (user_id, role, content) VALUES (%s,%s,%s)",
            (user_id, role, content),
        )
        conn.commit()
        conn.close()
    except Exception as e:
        print("save_message:", e)
        try:
            conn.close()
        except Exception:
            pass


def get_history(user_id, limit=50):
    if not user_id:
        return []
    conn = get_db_connection()
    if not conn:
        return []
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute(
            "SELECT role, content, timestamp FROM messages WHERE user_id = %s ORDER BY timestamp ASC LIMIT %s",
            (user_id, limit),
        )
        rows = cur.fetchall()
        conn.close()
        res = []
        for r in rows:
            d = dict(r)
            if d.get("timestamp"):
                d["timestamp"] = d["timestamp"].isoformat()
            res.append(d)
        return res
    except Exception as e:
        print("get_history:", e)
        try:
            conn.close()
        except Exception:
            pass
        return []


def clear_history(user_id):
    if not user_id:
        return
    conn = get_db_connection()
    if not conn:
        return
    try:
        cur = conn.cursor()
        cur.execute("DELETE FROM messages WHERE user_id = %s", (user_id,))
        conn.commit()
        conn.close()
    except Exception as e:
        print("clear_history:", e)
        try:
            conn.close()
        except Exception:
            pass
