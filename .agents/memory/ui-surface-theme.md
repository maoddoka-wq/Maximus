---
name: Surfaces de tableaux
description: Règle visuelle pour éviter des tableaux et cartes qui paraissent blancs malgré le thème MAXIMUS.
---

Les tableaux et surfaces publiques doivent utiliser des fonds opaques issus du thème (`muted`, `secondary` ou `background`) plutôt que des blancs explicites ou des transparences faibles.

**Why:** `--card` est très clair et les alpha backgrounds se composent avec lui ; le résultat reste visuellement blanc, contrairement au module Stock qui donne une vraie surface teintée aux tableaux.

**How to apply:** Pour un nouveau tableau, reprendre les surfaces opaques du module Stock, alterner les lignes avec `secondary`, et réserver `bg-white` aux images ou éléments qui ont besoin d’un fond blanc réel.