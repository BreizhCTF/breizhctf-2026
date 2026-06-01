# Sage
Vous pouvez lancer sage avec docker:

```bash
# docker run -it -v $(pwd):/home/sage/work -w /home/sage/work sagemath/sagemath sage
# Par exemple:
docker run -it -v $(pwd):/home/sage/work -w /home/sage/work sagemath/sagemath sage 2_solver.sage
```
