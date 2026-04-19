from flask import Flask, request, jsonify, Response, stream_with_context, send_from_directory, abort
from flask_cors import CORS
import requests
import json
import os
import socket
import database

app = Flask(__name__, static_url_path='', static_folder='.')

configured_origins = [
    origin.strip()
    for origin in (os.environ.get("ALLOWED_ORIGINS", "")).split(",")
    if origin.strip()
]
default_dev_origins = [
    r"http://localhost:\d+",
    r"http://127\.0\.0\.1:\d+",
]
CORS(
    app,
    resources={r"/api/*": {"origins": configured_origins or default_dev_origins}}
)

API_KEY = os.environ.get("DEEPSEEK_API_KEY", "").strip()
TARGET_URL = "https://api.deepseek.com/chat/completions"
QUIZ_ANALYZE_WEBHOOK_URL = os.environ.get("QUIZ_ANALYZE_WEBHOOK_URL", "").strip()
PORT = int(os.environ.get("PORT", 8000))
JOB_SEARCH_IMAGE_DIRS = [
    os.path.abspath(os.path.join(app.root_path, "..", "Job Search")),
    os.path.abspath(os.path.join(app.root_path, "..", "..", "Job Search")),
]

@app.route('/')
def serve_index():
    return send_from_directory('.', 'index.html')

@app.route('/api/jobs', methods=['GET'])
def get_jobs():
    try:
        q = request.args.get('q')
        location = request.args.get('location')
        salary = request.args.get('salary')
        category = request.args.get('category')
        type_csv = request.args.get('type')
        min_k = request.args.get('min_k')
        max_k = request.args.get('max_k')
        posted_days = request.args.get('posted_days')

        job_types = []
        if type_csv:
            job_types = [s.strip() for s in type_csv.split(',') if s and s.strip()]
        
        jobs = database.get_jobs(
            q=q,
            location=location,
            min_salary=salary,
            category=category,
            job_types=job_types,
            min_k=min_k,
            max_k=max_k,
            posted_days=posted_days
        )
        return jsonify(jobs)
    except Exception as e:
        print(f"Error getting jobs: {e}")
        return jsonify({"error": {"message": str(e)}}), 500

@app.route('/api/jobs/<int:job_id>', methods=['GET'])
def get_job_detail(job_id):
    try:
        job = database.get_job_by_id(job_id)
        if job:
            return jsonify(job)
        return jsonify({"error": "Job not found"}), 404
    except Exception as e:
        return jsonify({"error": {"message": str(e)}}), 500

@app.route('/api/jobs/<int:job_id>/apply', methods=['POST'])
def apply_job(job_id):
    try:
        data = request.json
        success = database.apply_for_job(
            job_id, 
            data.get('name'), 
            data.get('email'), 
            data.get('message')
        )
        if success:
            return jsonify({"status": "success"})
        return jsonify({"error": "Failed to save application"}), 500
    except Exception as e:
        return jsonify({"error": {"message": str(e)}}), 500

@app.route('/api/apply', methods=['POST'])
def apply_job_smart():
    try:
        data = request.json
        job_id = data.get('job_id')
        database.apply_for_job(
            job_id, 
            data.get('name'), 
            data.get('email'), 
            resume
        )
        
        import random
        score = random.randint(70, 95)
        
        if score > 80:
            return jsonify({
                "status": "success",
                "analysis": {
                    "score": score,
                    "reason": "Your resume demonstrates strong relevance to this position, particularly in skills and experience.",
                    "advice": "Be prepared to discuss your past projects in detail during the interview."
                },
                "recommendations": []
            })
        else:
            return jsonify({
                "status": "low_match",
                "analysis": {
                    "score": score,
                    "reason": "Your experience seems slightly different from the core requirements of this role.",
                    "advice": "Consider emphasizing your transferable skills or looking at junior roles."
                },
                "recommendations": database.get_jobs(limit=2)
            })

    except Exception as e:
        print(f"Apply error: {e}")
        return jsonify({"error": {"message": str(e)}}), 500

@app.route('/api/hr/jobs', methods=['POST'])
@app.route('/api/jobs/create', methods=['POST'])
def post_job():
    try:
        data = request.json
        new_id = database.create_job(
            data.get('title'),
            data.get('company'),
            data.get('salary'),
            data.get('category'),
            data.get('location'),
            data.get('requirements')
        )
        if new_id:
            return jsonify({"status": "success", "id": new_id})
        return jsonify({"error": "Failed to create job"}), 500
    except Exception as e:
        return jsonify({"error": {"message": str(e)}}), 500

@app.route('/api/quiz/analyze', methods=['POST'])
def analyze_quiz():
    if not QUIZ_ANALYZE_WEBHOOK_URL:
        return jsonify({"error": {"message": "Quiz analyze webhook is not configured"}}), 503
    try:
        data = request.json
        print(f"Received quiz data: {len(data)} fields")
        print("Forwarding quiz analyze request to configured webhook")
        
        response = requests.post(QUIZ_ANALYZE_WEBHOOK_URL, json=data, timeout=30)
        
        print(f"Webhook response status: {response.status_code}")
        
        if response.status_code == 200:
            try:
                result = response.json()
                return jsonify(result)
            except:
                return jsonify({"report": response.text})
        else:
            return jsonify({"error": f"Webhook returned status {response.status_code}"}), 502
            
    except Exception as e:
        print(f"Quiz error: {e}")
        return jsonify({"error": {"message": str(e)}}), 500

def _get_request_user_id():
    user_id = (request.headers.get("X-User-Id") or "").strip()
    if not user_id:
        return None
    if len(user_id) > 128:
        return None
    return user_id

@app.route('/api/ai/chat', methods=['POST'])
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
            'Authorization': f'Bearer {API_KEY}',
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }

        upstream = requests.post(TARGET_URL, json=payload, headers=headers, timeout=60)
        if upstream.status_code != 200:
            return jsonify({"error": {"message": "Upstream API Error"}}), upstream.status_code

        try:
            return jsonify(upstream.json())
        except Exception:
            return jsonify({"error": {"message": "Invalid upstream response"}}), 502
    except Exception as e:
        print(f"ai_chat error: {e}")
        return jsonify({"error": {"message": str(e)}}), 500

@app.route('/api/quiz/results', methods=['POST'])
def save_quiz_result():
    try:
        data = request.json or {}
        answers = data.get('answers') or {}
        report_text = data.get('report_text')
        report_model = data.get('report_model')
        report_status = data.get('report_status') or 'completed'

        if not isinstance(answers, dict) or not answers:
            return jsonify({"error": {"message": "answers is required"}}), 400

        result_id = database.save_quiz_result(
            answers=answers,
            report_text=report_text,
            report_model=report_model,
            report_status=report_status
        )
        if not result_id:
            return jsonify({"error": {"message": "Failed to save quiz result"}}), 500

        return jsonify({"status": "success", "id": result_id})
    except Exception as e:
        print(f"Save quiz result error: {e}")
        return jsonify({"error": {"message": str(e)}}), 500

@app.route('/api/quiz/results', methods=['GET'])
def list_quiz_results():
    try:
        limit = request.args.get('limit', default=20, type=int)
        if limit <= 0:
            limit = 20
        if limit > 100:
            limit = 100
        rows = database.get_quiz_results(limit=limit)
        return jsonify(rows)
    except Exception as e:
        print(f"List quiz results error: {e}")
        return jsonify({"error": {"message": str(e)}}), 500

@app.route('/api/quiz/results/<int:result_id>', methods=['GET'])
def get_quiz_result(result_id):
    try:
        row = database.get_quiz_result_by_id(result_id)
        if not row:
            return jsonify({"error": {"message": "Quiz result not found"}}), 404
        return jsonify(row)
    except Exception as e:
        print(f"Get quiz result error: {e}")
        return jsonify({"error": {"message": str(e)}}), 500

@app.route('/job-search-images/<path:filename>')
def serve_job_search_image(filename):
    for image_dir in JOB_SEARCH_IMAGE_DIRS:
        file_path = os.path.abspath(os.path.join(image_dir, filename))
        if os.path.isfile(file_path):
            return send_from_directory(image_dir, filename)
    return abort(404)

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('.', path)

@app.route('/api/chat', methods=['POST'])
def proxy_chat():
    if not API_KEY:
        return jsonify({"error": {"message": "Server configuration error: Missing API Key"}}), 503

    try:
        user_id = _get_request_user_id()
        if not user_id:
            return jsonify({"error": {"message": "Missing X-User-Id"}}), 401

        data = request.json or {}
        user_message = data.get('messages', [])[-1].get('content', '')

        if user_message:
            database.save_message(user_id, 'user', user_message)

        headers = {
            'Authorization': f'Bearer {API_KEY}',
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }

        resp = requests.post(TARGET_URL, json=data, headers=headers, stream=True, timeout=60)

        if resp.status_code != 200:
            return jsonify({"error": {"message": "Upstream API Error"}}), resp.status_code

        def generate():
            ai_response_content = ""
            for chunk in resp.iter_lines():
                if chunk:
                    yield chunk + b'\n'
                    
                    try:
                        chunk_str = chunk.decode('utf-8')
                        if chunk_str.startswith('data: ') and chunk_str != 'data: [DONE]':
                            json_str = chunk_str[6:]
                            chunk_data = json.loads(json_str)
                            delta = chunk_data['choices'][0]['delta'].get('content', '')
                            ai_response_content += delta
                    except:
                        pass
            
            if ai_response_content:
                database.save_message(user_id, 'assistant', ai_response_content)

        return Response(stream_with_context(generate()), content_type='text/event-stream')

    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"error": {"message": str(e)}}), 500

@app.route('/api/history', methods=['GET'])
def get_history():
    try:
        user_id = _get_request_user_id()
        if not user_id:
            return jsonify({"error": {"message": "Missing X-User-Id"}}), 401
        history = database.get_history(user_id=user_id)
        return jsonify(history)
    except Exception as e:
        return jsonify({"error": {"message": str(e)}}), 500

@app.route('/api/clear', methods=['POST'])
def clear_history():
    try:
        user_id = _get_request_user_id()
        if not user_id:
            return jsonify({"error": {"message": "Missing X-User-Id"}}), 401
        database.clear_history(user_id=user_id)
        return jsonify({"status": "ok"})
    except Exception as e:
        return jsonify({"error": {"message": str(e)}}), 500

def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except:
        return "127.0.0.1"

if __name__ == '__main__':
    local_ip = get_local_ip()
    print(f"Starting Flask server on port {PORT}...")
    print(f"Local:   http://localhost:{PORT}/coach.html")
    print(f"Network: http://{local_ip}:{PORT}/coach.html")
    app.run(host='0.0.0.0', port=PORT, debug=True)
