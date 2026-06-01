FROM debian:bookworm-slim AS builder

RUN apt-get update && \
    apt-get install -y --no-install-recommends g++ make && \
    rm -rf /var/lib/apt/lists/*

COPY cgi/ /build/cgi/
RUN cd /build/cgi && make

FROM debian:bookworm-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends nginx fcgiwrap && \
    rm -rf /var/lib/apt/lists/*

RUN mkdir -p /usr/lib/cgi-bin
COPY --from=builder /build/cgi/validator /usr/lib/cgi-bin/validator
RUN chown root:www-data /usr/lib/cgi-bin/validator && \
    chmod 750 /usr/lib/cgi-bin/validator


COPY www/index.html   /var/www/html/index.html
COPY www/error.html   /var/www/html/error.html
COPY www/success.html /var/www/html/success.html
RUN chown root:www-data /var/www/html/index.html \
                        /var/www/html/error.html \
                        /var/www/html/success.html && \
    chmod 644 /var/www/html/index.html \
              /var/www/html/error.html \
              /var/www/html/success.html

# nginx config
COPY nginx/default.conf /etc/nginx/sites-enabled/default
RUN rm -f /etc/nginx/sites-enabled/default.bak


RUN printf 'server_tokens off;\n' > /etc/nginx/conf.d/security.conf

RUN rm -f /var/www/html/index.nginx-debian.html

RUN mkdir -p /run/fcgiwrap && chown www-data:www-data /run/fcgiwrap


COPY entrypoint.sh /entrypoint.sh
RUN chmod 755 /entrypoint.sh

EXPOSE 80

ENTRYPOINT ["/entrypoint.sh"]
