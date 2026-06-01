Ce Docker est un proxy LiteLLM qui fait office de load balancer.
1 seul pour tout le monde.

Là il est en mode 0 authentification... Vu comment c'est parti ça va finir comme ça.
Je crois que le rate limiting c'est mort. J'espère que les gens seront pas *trop* des cons.

- **Image :** Onglet verified, `vllm/vllm-openai:latest`
  - Modifier l'entrypoint : `google/gemma-4-E4B-it --host 0.0.0.0 --port 8000 --dtype auto --enforce-eager --gpu-memory-utilization 0.90 --max-model-len 8128 --enable-auto-tool-choice --tool-call-parser gemma4 --async-scheduling`
  - VLLM_API_KEY: Créer un nouveau secret
- **GPU :** RTX 4090 x1
- **Storage :**
  - **Container disk :** 5GB
  - **Persistent storage :** `Volume disk` 25GB
