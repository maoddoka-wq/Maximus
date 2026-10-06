---
name: Export vidéo long
description: Stratégie fiable pour capturer et encoder des films générés dans le navigateur.
---

Pour les exports vidéo longs (plus d’une minute), capturer le screencast en images numérotées sur disque, puis encoder et muxer hors ligne. Éviter de maintenir un unique flux CDP/FFmpeg pendant toute la durée: une capture d’environ 80 secondes s’est déconnectée avant de produire un MP4 complet, alors que la séquence écrite sur disque a abouti.

**Why:** Le canal de capture CDP peut se fermer pendant un enregistrement continu, laissant un fichier incomplet et interrompant le workflow.

**How to apply:** Pour les films longs, écrire les images en séquence numérotée, les assembler à la cadence désirée, muxer l’audio séparément, puis vérifier la durée, la résolution, les pistes et le décodage avant livraison.
