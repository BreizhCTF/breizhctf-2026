FROM node:25-slim

RUN apt-get update && apt-get install -y \
    figlet \
    fonts-dejavu \
    libfontconfig1 \
    openssl \
    && rm -rf /var/lib/apt/lists/*

RUN useradd -m -s /bin/bash appuser

COPY flag.txt /flag.txt
RUN mv /flag.txt /flag-$(openssl rand -hex 8).txt
RUN chmod 444 /flag-*.txt

WORKDIR /app

COPY app/package.json ./
RUN npm install --omit=dev

COPY --chown=root:root app/ .

# RUN chown -R root:root /app \
#     && find /app -type f -exec chmod 644 {} \; \
#     && find /app -type d -exec chmod 755 {} \;

USER appuser

EXPOSE 8000

CMD ["node", "server.js"]
