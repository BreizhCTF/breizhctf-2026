ARG REGISTRY=registry.bzh.alfred.cafe
FROM ${REGISTRY}/breizh-ctf-2026/chall-maker/container/tcp

ENV FLAG="BZHCTF{en_renseignant_ce_flag_je_certifie_ne_pas_avoir_utilise_de_LLM}"

COPY --chmod=755 --chown=root:root challenge.py /challenge/challenge
