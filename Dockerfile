FROM python:3.11-slim

# Create non-root user
RUN useradd -m appuser

WORKDIR /home/appuser/app

# Install dependencies as root before switching user
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy only the application source (Dockerfile, .env*, __pycache__ excluded via .dockerignore)
COPY app ./app

# Hand ownership to appuser and drop root privileges
RUN chown -R appuser:appuser /home/appuser/app
USER appuser

# Create logs directory the app will write to at runtime
RUN mkdir -p /home/appuser/app/logs

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1"]
