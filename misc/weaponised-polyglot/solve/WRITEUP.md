Python + Ruby
```python
print(open('flag.txt').read())
```

On ajoute PHP
```php
# <?php echo file_get_contents('flag.txt') ?>
print(open('flag.txt').read())
```

On ajoute Bash
```bash
# <?php echo file_get_contents('flag.txt') ?>
"`cat flag.txt >/proc/$$/fd/1`"
print(open('flag.txt').read())
```

On ajoute SQL
```sql
# <?php echo file_get_contents('flag.txt') ?>
"`cat flag.txt >/proc/$$/fd/1`"
print(open('flag.txt').read())
--"""
;
SELECT readfile('flag.txt');
--"""
```

On ajoute Lua

Un peu plus complexe mais on peut abuser des commentaires:
- ``'''`` pour python. En écrivant ``''''`` on a ``''+''`` en Ruby !
- ``%{  }`` pour Ruby
- ``--`` pour Lua. Que Python et Ruby vont pouvoir utiliser en écrivant ``<V>=<N>--<N>``.
```lua
s=1--1;''''# <?php echo file_get_contents('flag.txt') ?>
s=1--1;print('RUBY ONLY');%{
print('LUA ONLY');
--}
--#'''

s=1--1;print('PYTHON AND RUBY ONLY')
```

Si on assemble tout notre patchwork:
```lua
b="`cat flag.txt >/proc/$$/fd/1`"
s=1--1;''''# <?php echo file_get_contents('flag.txt') ?>
s=1--1;%{
print(io.open("flag.txt", "rb"):read());
--}
--#'''

s=1--1;print(open('flag.txt').read())
--"""
--[[
;
SELECT readfile('flag.txt');
--"""#]]
```

Plus qu'à ajouter le dernier, Perl:
```perl
s="`cat flag.txt >/proc/$$/fd/1`"
g=1--1;''''# <?php echo file_get_contents('flag.txt') ?>
a=g;s=0--1;%{
print(io.open("flag.txt", "rb"):read());
--}
--#'''

s=1--1;print(open('flag.txt').read())
--"""
--[[
;
SELECT readfile('flag.txt');
--"""#]];b=g;s=1--=a=g;open(F,"flag.txt");print(<F>);
```

L'astuce du Perl est de tout ré-écrire avec la **substitution**.

Par défaut Perl des ``$`` en début de nom de variable, exemple: ``$a``.

Pour continuer à utiliser des noms de variables sans ``$`` sans que Perl ne crash on abuse donc de la substitution.

La forme de la substition est ``s/remplacé/remplaceur/paramètre;``, je vous laisse un peu creuser sur son utilisation mais ce qui est ici intéressant c'est que le séparateur est n'importe quel caractère spécial de notre choix ! Par défaut on pense à ``/`` mais ``-``et ``=`` fonctionnent aussi !

On peut donc écrire ``s=...n'importe quoi...=...toujours plus...=<paramètre>;``. Comme paramètre j'ai pris ``g`` pour que vous y voyez mieux.
