ARG REGISTRY="registry.bzh.alfred.cafe"
FROM ${REGISTRY}/breizh-ctf-2026/chall-maker/container/tcp

COPY --chmod=755 --chown=root:root ./relang.py /challenge/relang.py
COPY --chmod=755 --chown=root:root ./challenge.py /challenge/challenge
COPY --chmod=755 --chown=root:root ./a_very_well_hidden_flag.txt /challenge/a_very_well_hidden_flag.txt