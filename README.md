# AI Chat Web App

A streaming AI chat app built with Python (Flask), HTML, CSS and vanilla JavaScript.
The backend exposes a REST API and calls the Anthropic Messages API.

## Run it

```bash
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # then add your ANTHROPIC_API_KEY
python app.py                   # open http://127.0.0.1:5000
```

## API

| Method | Route         | Description                                          |
|--------|---------------|------------------------------------------------------|
| GET    | `/`           | Chat page                                            |
| GET    | `/api/health` | Health check                                         |
| POST   | `/api/chat`   | Body `{"messages":[{"role","content"}]}`; streams SSE |

## Structure

```
app.py              Flask server, validation, streaming endpoint
templates/          index.html
static/             style.css, script.js
```

## Ideas to extend

- Render Markdown and code blocks
- Save conversations in SQLite
- User login and per-user history
- Model picker and system-prompt settings
- Deploy to Render or Railway
