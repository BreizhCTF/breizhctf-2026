FROM python:3.13.12-alpine3.23
WORKDIR /build
COPY main.py ./
RUN python -m compileall -b main.py && mv main.pyc seems-empty.pyc
