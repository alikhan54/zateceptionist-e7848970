FROM python:3.11-slim AS builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt

FROM python:3.11-slim
RUN useradd -m -u 10003 bsh
WORKDIR /app
COPY --from=builder /root/.local /home/bsh/.local
COPY --chown=bsh:bsh main.py prompts/ ./
COPY --chown=bsh:bsh prompts/ ./prompts/
USER bsh
ENV PATH=/home/bsh/.local/bin:$PATH
ENV PYTHONUNBUFFERED=1
EXPOSE 9103
HEALTHCHECK --interval=30s CMD curl -fsS http://localhost:9103/health || exit 1
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "9103"]
