"""AI chat web app: Flask backend that streams replies from the Anthropic API."""
import json
import os

import anthropic
from dotenv import load_dotenv
from flask import Flask, Response, jsonify, render_template, request, stream_with_context

load_dotenv()

app = Flask(__name__)
client = anthropic.Anthropic()  # reads ANTHROPIC_API_KEY from the environment

MODEL = os.getenv("MODEL", "claude-sonnet-4-6")
SYSTEM_PROMPT = os.getenv(
    "SYSTEM_PROMPT",
    "You are a helpful, concise assistant. Use Markdown only when it helps.",
)
MAX_MESSAGES = 20        # keep the last N messages to limit token use
MAX_CHARS = 4000         # per-message input limit


def clean_messages(raw):
    """Validate and trim the chat history sent by the browser."""
    if not isinstance(raw, list) or not raw:
        return None
    messages = []
    for m in raw[-MAX_MESSAGES:]:
        role, content = m.get("role"), str(m.get("content", "")).strip()
        if role not in ("user", "assistant") or not content:
            return None
        messages.append({"role": role, "content": content[:MAX_CHARS]})
    # The API requires the conversation to start with a user turn.
    while messages and messages[0]["role"] != "user":
        messages.pop(0)
    return messages or None


@app.get("/")
def index():
    return render_template("index.html")


@app.get("/api/health")
def health():
    return jsonify(status="ok", model=MODEL)


@app.post("/api/chat")
def chat():
    data = request.get_json(silent=True) or {}
    messages = clean_messages(data.get("messages"))
    if not messages:
        return jsonify(error="Send a non-empty list of messages."), 400

    def generate():
        try:
            with client.messages.stream(
                model=MODEL,
                max_tokens=1024,
                system=SYSTEM_PROMPT,
                messages=messages,
            ) as stream:
                for text in stream.text_stream:
                    yield f"data: {json.dumps({'text': text})}\n\n"
            yield "data: [DONE]\n\n"
        except anthropic.AuthenticationError:
            yield f"data: {json.dumps({'error': 'Invalid API key. Check your .env file.'})}\n\n"
        except anthropic.RateLimitError:
            yield f"data: {json.dumps({'error': 'Rate limit reached. Wait a moment and retry.'})}\n\n"
        except anthropic.APIError as e:
            yield f"data: {json.dumps({'error': f'API error: {e.message}'})}\n\n"

    return Response(
        stream_with_context(generate()),
        mimetype="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


if __name__ == "__main__":
    app.run(debug=True)
