---
name: Formatage des contrôleurs Laravel
description: Éviter les larges changements de formatage quand Pint relève des écarts historiques dans les contrôleurs Laravel.
---

Ne pas appliquer Pint à l’intégralité d’un contrôleur Laravel historique pour corriger quelques changements ciblés. Vérifier les écarts liés aux lignes modifiées et privilégier la syntaxe, les tests ciblés et un diff lisible; signaler les problèmes de formatage préexistants séparément.

**Why:** les contrôleurs existants contiennent des incohérences de formatage hors périmètre; une correction globale crée un diff volumineux sans améliorer la fonctionnalité demandée.

**How to apply:** lors d’une modification ciblée d’un contrôleur Laravel, contrôler le diff et lancer Pint sur les nouveaux petits fichiers ou sur les zones faciles à isoler, plutôt que reformater tout le contrôleur.