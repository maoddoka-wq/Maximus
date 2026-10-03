---
name: Formatage des contrôleurs Laravel
description: Éviter les larges changements de formatage quand Pint relève des écarts historiques dans les contrôleurs Laravel.
---

Ne pas appliquer Pint à l’intégralité d’un contrôleur Laravel historique pour corriger quelques changements ciblés. Vérifier les écarts liés aux lignes modifiées et privilégier la syntaxe, les tests ciblés et un diff lisible; signaler les problèmes de formatage préexistants séparément.

**Why:** les contrôleurs existants contiennent des incohérences de formatage hors périmètre; une correction globale crée un diff volumineux sans améliorer la fonctionnalité demandée.

**How to apply:** lors d’une modification ciblée d’un contrôleur Laravel, contrôler le diff et lancer Pint sur les nouveaux petits fichiers ou sur les zones faciles à isoler, plutôt que reformater tout le contrôleur.

L’outil de création de nouveaux fichiers peut omettre le saut de ligne final, ce qui fait échouer Pint alors que le PHP est valide. Vérifier le LF final des nouveaux fichiers avant de corriger d’autres règles.

**Why:** Les nouveaux contrôleurs, tests et migrations ont été rejetés pour `single_blank_line_at_eof` ; le problème venait de leur création, pas de leur logique.

**How to apply:** Ajouter le saut de ligne final avec une modification ciblée. Si le style attendu n’est pas clair, formater une copie temporaire hors du dépôt et examiner le diff, sans reformater le fichier historique original.