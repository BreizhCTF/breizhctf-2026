FROM python:3.11-alpine

ARG FLAG=BZHCTF{FakeFlag}

RUN apk add --no-cache gcc musl-dev

COPY --chown=root:root --chmod=600 ./flag.txt /flag.txt

COPY getflag.c /tmp/getflag.c
RUN gcc -o /getflag /tmp/getflag.c \
    && chmod 4111 /getflag \
    && rm /tmp/getflag.c

COPY requirements.txt /
RUN pip3 install --break-system-packages -r /requirements.txt

COPY src /director

WORKDIR /director

EXPOSE 5000

CMD ["gunicorn", "-b", "127.0.0.1:5000", "-w", "2", "--access-logfile", "-", "--error-logfile", "-", "app:create_app()"]
