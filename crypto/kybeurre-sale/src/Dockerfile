ARG REGISTRY=registry.bzh.alfred.cafe
FROM ${REGISTRY}/breizh-ctf-2026/chall-maker/container/tcp

ENV FLAG="BZHCTF{the_human_middleware_just_solved_your_lwe_system_linearly}"

COPY requirements.txt .
USER root
RUN pip install -r requirements.txt --break-system-packages
USER challenge

COPY --chmod=700 --chown=challenge:challenge server.py /challenge/challenge
