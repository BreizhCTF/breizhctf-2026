FROM ghcr.io/berriai/litellm:main-stable
# Soon le tag 1.84.0 parce que c'est versionné comme de la merde

WORKDIR /app

COPY config.yaml /app/config.yaml

EXPOSE 4000

CMD ["--config", "/app/config.yaml", "--port", "4000"]
