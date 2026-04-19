"""Flask app: static pages + API. Set DEEPSEEK_API_KEY or _DEFAULT_DEEPSEEK_API_KEY in this file."""
import json
import os
import socket
from pathlib import Path

try:
    from dotenv import load_dotenv
    _ef = (os.environ.get("EASYJOB_ENV_FILE") or "").strip()
    if _ef and Path(_ef).is_file():
        load_dotenv(_ef, override=False)
    load_dotenv(Path(__file__).resolve().parent / ".env", override=False)
except ImportError:
    pass

_DEFAULT_DEEPSEEK_API_KEY = "sk-c86c1b5ec1a24631a7aa6b6597debcb6"
_DEFAULT_ALLOWED_ORIGINS = ""
_DEFAULT_QUIZ_WEBHOOK = ""

import requests
from flask import Flask, Response, abort, jsonify, request, send_from_directory, stream_with_context
from flask_cors import CORS

import database

app = Flask(__name__, static_url_path="", static_folder=".")

_origins = (os.environ.get("ALLOWED_ORIGINS", "") or "").strip() or (_DEFAULT_ALLOWED_ORIGINS or "").strip()
configured = [o.strip() for o in _origins.split(",") if o.strip()]
CORS(
    app,
    resources={r"/api/*": {"origins": configured or [r"http://localhost:\d+", r"http://127\.0\.0\.1:\d+"]}},
)

API_KEY = (os.environ.get("DEEPSEEK_API_KEY", "") or "").strip() or (_DEFAULT_DEEPSEEK_API_KEY or "").strip()
TARGET_URL = "https://api.deepseek.com/chat/completions"
QUIZ_ANALYZE_WEBHOOK_URL = (
    (os.environ.get("QUIZ_ANALYZE_WEBHOOK_URL", "") or "").strip() or (_DEFAULT_QUIZ_WEBHOOK or "").strip()
)
PORT = int(os.environ.get("PORT", 8000))
JOB_SEARCH_IMAGE_DIRS = [
    os.path.abspath(os.path.join(app.root_path, "..", "Job Search")),
    os.path.abspath(os.path.join(app.root_path, "..", "..", "Job Search")),
]


@app.route("/")
def serve_index():
    return send_from_directory(".", "index.html")


@app.route("/api/jobs", methods=["GET"])
def get_jobs():
    try:
        if not database.is_database_url_configured():
            return (
                jsonify(
                    {
                        "error": {
                            "code": "NO_DB_CONFIG",
                            "message": "DATABASE_URL is not set (or split DB_* vars incomplete).",
                        }
                    }
                ),
                503,
            )
        probe = database.get_db_connection()
        if probe is None:
            return (
                jsonify(
                    {
                        "error": {
                            "code": "DB_CONNECT_FAILED",
                            "message": "Cannot connect to PostgreSQL. Check URL in database.py and network.",
                        }
                    }
                ),
                503,
            )
        probe.close()

        job_types = []
        if request.args.get("type"):
            job_types = [s.strip() for s in request.args.get("type").split(",") if s.strip()]

        jobs = database.get_jobs(
            q=request.args.get("q"),
            location=request.args.get("location"),
            min_salary=request.args.get("salary"),
            category=request.args.get("category"),
            job_types=job_types,
            min_k=request.args.get("min_k"),
            max_k=request.args.get("max_k"),
            posted_days=request.args.get("posted_days"),
        )
        return jsonify(jobs)
    except Exception as e:
        print("Error getting jobs:", e)
        return jsonify({"error": {"message": str(e)}}), 500


@app.route("/api/jobs/<int:job_id>", methods=["GET"])
def get_job_detail(job_id):
    try:
        job = database.get_job_by_id(job_id)
        if job:
            return jsonify(job)
        return jsonify({"error": "Job not found"}), 404
    except Exception as e:
        return jsonify({"error": {"message": str(e)}}), 500


@app.route("/api/jobs/<int:job_id>/apply", methods=["POST"])
def apply_job(job_id):
    try:
        data = request.json or {}
        ok = database.apply_for_job(
            job_id, data.get("name"), data.get("email"), data.get("message")
        )
        if ok:
            return jsonify({"status": "success"})
        return jsonify({"error": "Failed to save application"}), 500
    except Exception as e:
        return jsonify({"error": {"message": str(e)}}), 500


@app.route("/api/apply", methods=["POST"])
def apply_job_smart():
    try:
        import random

        data = request.json or {}
        job_id = data.get("job_id")
        database.apply_for_job(
            job_id,
            data.get("name"),
            data.get("email"),
            data.get("message"),
        )
        score = random.randint(70, 95)
        if score > 80:
            return jsonify(
                {
                    "status": "success",
                    "analysis": {
                        "score": score,
                        "reason": "Your resume demonstrates strong relevance to this position, particularly in skills and experience.",
                        "advice": "Be prepared to discuss your past projects in detail during the interview.",
                    },
                    "recommendations": [],
                }
            )
        return jsonify(
            {
                "status": "low_match",
                "analysis": {
                    "score": score,
                    "reason": "Your experience seems slightly different from the core requirements of this role.",
                    "advice": "Consider emphasizing your transferable skills or looking at junior roles.",
                },
                "recommendations": database.get_jobs(limit=2),
            }
        )
    except Exception as e:
        print("Apply error:", e)
        return jsonify({"error": {"message": str(e)}}), 500


@app.route("/api/hr/jobs", methods=["POST"])
@app.route("/api/jobs/create", methods=["POST"])
def post_job():
    try:
        data = request.json or {}
        new_id = database.create_job(
            data.get("title"),
            data.get("company"),
            data.get("salary"),
            data.get("category"),
            data.get("location"),
            data.get("requirements"),
        )
        if new_id:
            return jsonify({"status": "success", "id": new_id})
        return jsonify({"error": "Failed to create job"}), 500
    except Exception as e:
        return jsonify({"error": {"message": str(e)}}), 500


@app.route("/api/quiz/analyze", methods=["POST"])
def analyze_quiz():
    if not QUIZ_ANALYZE_WEBHOOK_URL:
        return jsonify({"error": {"message": "Quiz analyze webhook is not configured"}}), 503
    try:
        data = request.json
        r = requests.post(QUIZ_ANALYZE_WEBHOOK_URL, json=data, timeout=30)
        if r.status_code == 200:
            try:
                return jsonify(r.json())
            except Exception:
                return jsonify({"report": r.text})
        return jsonify({"error": f"Webhook returned status {r.status_code}"}), 502
    except Exception as e:
        print("Quiz error:", e)
        return jsonify({"error": {"message": str(e)}}), 500


def _get_request_user_id():
    uid = (request.headers.get("X-User-Id") or "").strip()
    if not uid or len(uid) > 128:
        return None
    return uid


@app.route("/api/ai/chat", methods=["POST"])
def ai_chat():
    if not API_KEY:
        return jsonify({"error": {"message": "Server configuration error: Missing API Key"}}), 503
    try:
        data = request.json or {}
        payload = {
            "model": data.get("model", "deepseek-chat"),
            "messages": data.get("messages", []),
            "temperature": data.get("temperature", 0.5),
            "stream": bool(data.get("stream", False)),
        }
        if not isinstance(payload["messages"], list) or not payload["messages"]:
            return jsonify({"error": {"message": "messages is required"}}), 400
        headers = {
            "Authorization": f"Bearer {API_KEY}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
        upstream = requests.post(TARGET_URL, json=payload, headers=headers, timeout=60)
        if upstream.status_code != 200:
            return jsonify({"error": {"message": "Upstream API Error"}}), upstream.status_code
        try:
            return jsonify(upstream.json())
        except Exception:
            return jsonify({"error": {"message": "Invalid upstream response"}}), 502
    except Exception as e:
        print("ai_chat error:", e)
        return jsonify({"error": {"message": str(e)}}), 500


@app.route("/api/quiz/results", methods=["POST"])
def save_quiz_result():
    try:
        data = request.json or {}
        answers = data.get("answers") or {}
        if not isinstance(answers, dict) or not answers:
            return jsonify({"error": {"message": "answers is required"}}), 400
        rid = database.save_quiz_result(
            answers=answers,
            report_text=data.get("report_text"),
            report_model=data.get("report_model"),
            report_status=data.get("report_status") or "completed",
        )
        if not rid:
            return jsonify({"error": {"message": "Failed to save quiz result"}}), 500
        return jsonify({"status": "success", "id": rid})
    except Exception as e:
        print("Save quiz result error:", e)
        return jsonify({"error": {"message": str(e)}}), 500


@app.route("/api/quiz/results", methods=["GET"])
def list_quiz_results():
    try:
        limit = request.args.get("limit", default=20, type=int)
        limit = max(1, min(limit if limit > 0 else 20, 100))
        return jsonify(database.get_quiz_results(limit=limit))
    except Exception as e:
        print("List quiz results error:", e)
        return jsonify({"error": {"message": str(e)}}), 500


@app.route("/api/quiz/results/<int:result_id>", methods=["GET"])
def get_quiz_result(result_id):
    try:
        row = database.get_quiz_result_by_id(result_id)
        if not row:
            return jsonify({"error": {"message": "Quiz result not found"}}), 404
        return jsonify(row)
    except Exception as e:
        print("Get quiz result error:", e)
        return jsonify({"error": {"message": str(e)}}), 500


@app.route("/job-search-images/<path:filename>")
def serve_job_search_image(filename):
    for image_dir in JOB_SEARCH_IMAGE_DIRS:
        fp = os.path.abspath(os.path.join(image_dir, filename))
        if os.path.isfile(fp):
            return send_from_directory(image_dir, filename)
    return abort(404)


@app.route("/api/chat", methods=["POST"])
def proxy_chat():
    if not API_KEY:
        return jsonify({"error": {"message": "Server configuration error: Missing API Key"}}), 503
    try:
        user_id = _get_request_user_id()
        if not user_id:
            return jsonify({"error": {"message": "Missing X-User-Id"}}), 401
        data = request.json or {}
        msgs = data.get("messages", [])
        if msgs:
            user_message = msgs[-1].get("content", "")
            if user_message:
                database.save_message(user_id, "user", user_message)
        headers = {
            "Authorization": f"Bearer {API_KEY}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
        resp = requests.post(TARGET_URL, json=data, headers=headers, stream=True, timeout=60)
        if resp.status_code != 200:
            return jsonify({"error": {"message": "Upstream API Error"}}), resp.status_code

        def generate():
            ai_text = ""
            for chunk in resp.iter_lines():
                if chunk:
                    yield chunk + b"\n"
                    try:
                        s = chunk.decode("utf-8")
                        if s.startswith("data: ") and s != "data: [DONE]":
                            delta = json.loads(s[6:])["choices"][0]["delta"].get("content", "")
                            ai_text += delta
                    except Exception:
                        pass
            if ai_text:
                database.save_message(user_id, "assistant", ai_text)

        return Response(stream_with_context(generate()), content_type="text/event-stream")
    except Exception as e:
        print("proxy_chat:", e)
        return jsonify({"error": {"message": str(e)}}), 500


@app.route("/api/history", methods=["GET"])
def get_history():
    try:
        user_id = _get_request_user_id()
        if not user_id:
            return jsonify({"error": {"message": "Missing X-User-Id"}}), 401
        return jsonify(database.get_history(user_id=user_id))
    except Exception as e:
        return jsonify({"error": {"message": str(e)}}), 500


@app.route("/api/clear", methods=["POST"])
def clear_history():
    try:
        user_id = _get_request_user_id()
        if not user_id:
            return jsonify({"error": {"message": "Missing X-User-Id"}}), 401
        database.clear_history(user_id=user_id)
        return jsonify({"status": "ok"})
    except Exception as e:
        return jsonify({"error": {"message": str(e)}}), 500


@app.route("/<path:path>")
def serve_static(path):
    return send_from_directory(".", path)


def _local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"


if __name__ == "__main__":
    lip = _local_ip()
    print(f"Starting Flask server on port {PORT}...")
    print(f"Local:   http://localhost:{PORT}/coach.html")
    print(f"Network: http://{lip}:{PORT}/coach.html")
    app.run(host="0.0.0.0", port=PORT, debug=True)
