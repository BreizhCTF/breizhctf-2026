# Solve

Simplification du solve avec un sage dockerisé:

```bash
cp ../files/sniffed.json .
docker run -it -v $(pwd):/home/sage/work -w /home/sage/work sagemath/sagemath 'pip install pycryptodome && sage solve.sage'
```
