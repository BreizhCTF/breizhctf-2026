FROM python:3.11-slim

WORKDIR /app

COPY app.elf /app/app.elf
COPY docker/inject_flag.py /app/inject_flag.py
COPY docker/entrypoint.sh /app/entrypoint.sh

RUN apt-get update \
	&& apt-get install -y --no-install-recommends qemu-user-static \
	&& rm -rf /var/lib/apt/lists/* \
	&& pip install --no-cache-dir speculos requests pycryptodome \
	&& chmod +x /app/entrypoint.sh

ENV SPECULOS_API_PORT=5000
ENV CHALLENGE_FLAG=BZHCTF{l3dg3r_4pdu_m4st3r_bzh!}

EXPOSE 5000

ENTRYPOINT ["/app/entrypoint.sh"]
