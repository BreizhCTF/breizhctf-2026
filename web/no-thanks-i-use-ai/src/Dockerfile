FROM python:3.14-slim

RUN apt-get update && apt-get install -y openssl chromium gosu curl && rm -rf /var/lib/apt/lists/*

RUN useradd -r -m -s /bin/false appuser && \
    useradd -r -m -s /bin/false botuser

COPY requirements.txt /requirements.txt
RUN pip install --no-cache-dir -r /requirements.txt

COPY app/ /app/
COPY bot/ /bot/
COPY flag.txt /
COPY entrypoint.sh /entrypoint.sh

RUN mkdir -p /app/uploads && \
    chown -R appuser /app && \
    chown -R botuser /bot && \
    chmod +x /entrypoint.sh

EXPOSE 5000

CMD ["/entrypoint.sh"]
