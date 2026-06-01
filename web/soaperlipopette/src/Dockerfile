FROM php:8-cli-alpine

COPY --chown=root:root --chmod=400 ./flag.txt /flag.txt

COPY getflag.c /tmp/getflag.c

RUN apk add --no-cache libxml2-dev gcc musl-dev \
    && docker-php-ext-install soap \
    && gcc -o /getflag /tmp/getflag.c \
    && chown root:root /getflag \
    && chmod 4111 /getflag \
    && rm /tmp/getflag.c \
    && apk del libxml2-dev gcc musl-dev

WORKDIR /app

EXPOSE 8080

RUN adduser -S -u 666 -h /app challenge

COPY ./index.php /app/index.php

USER challenge

CMD ["php", "-S", "0.0.0.0:8080", "-t", "/app"]
