ARG REGISTRY=registry.bzh.alfred.cafe
FROM ${REGISTRY}/breizh-ctf-2026/chall-maker/container/tcp

ENV FLAG="BZHCTF{gpt_erwann_removed_the_noise_for_better_kpis_and_synergy}"

COPY --chmod=700 --chown=challenge:challenge server.py /challenge/challenge
