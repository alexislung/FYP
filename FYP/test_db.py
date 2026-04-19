import psycopg2
import sys
import os

# 数据库连接配置
DB_HOST = os.environ.get("DB_HOST", "").strip()
DB_NAME = os.environ.get("DB_NAME", "").strip()
DB_USER = os.environ.get("DB_USER", "").strip()
DB_PASS = os.environ.get("DB_PASS", "").strip()
DB_PORT = os.environ.get("DB_PORT", "").strip()
DB_URL = os.environ.get("DATABASE_URL", "").strip()

if not DB_URL and all([DB_HOST, DB_NAME, DB_USER, DB_PASS, DB_PORT]):
    DB_URL = f"postgresql://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
DB_SSL_MODE = "require"

print(f"Testing connection to: {DB_HOST or 'from DATABASE_URL'}:{DB_PORT or ''}...")

if not DB_URL:
    print("❌ Missing database configuration. Set DATABASE_URL or DB_HOST/DB_NAME/DB_USER/DB_PASS/DB_PORT.")
    sys.exit(1)

try:
    conn = psycopg2.connect(DB_URL, sslmode=DB_SSL_MODE)
    print("✅ Connection successful!")
    
    # Test a simple query
    cur = conn.cursor()
    cur.execute("SELECT 1;")
    result = cur.fetchone()
    print(f"✅ Query result: {result}")
    
    conn.close()
    sys.exit(0)
except Exception as e:
    print(f"❌ Connection failed: {e}")
    sys.exit(1)
