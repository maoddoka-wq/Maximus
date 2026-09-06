---
name: Séparation production et démonstration
description: Les données fictives doivent rester confinées au développement local et ne jamais alimenter le fallback production.
---

La production ne doit jamais utiliser le seed KORA ou les comptes de démonstration comme données de repli. Le fallback production reste vide, les anciennes données fictives du navigateur sont filtrées au chargement et le provisioning de démonstration est refusé en production.

**Why:** Des fixtures locales présentes dans un store frontend peuvent être embarquées puis affichées sur une instance Render réelle, ce qui expose des comptes et fausse les données de l’entreprise.

**How to apply:** Toute nouvelle fixture doit être protégée par l’environnement de développement et tout nouveau provisioning de démonstration doit refuser explicitement `APP_ENV=production`.