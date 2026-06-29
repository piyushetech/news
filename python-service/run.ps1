@echo off
cd /d "%~dp0"
if not exist .venv (
  echo Creating virtual environment...
  python -m venv .venv
)
call .venv\Scripts\activate.bat
python -m pip install -q --upgrade pip
python -m pip install -q fastapi "uvicorn[standard]" pydantic pydantic-settings python-dotenv httpx feedparser beautifulsoup4 lxml structlog prometheus-client
echo Starting BriefNews Python service on http://127.0.0.1:8000
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
