---
name: Opt-in du rapport des ventes
description: Le rapport des ventes doit être autorisé explicitement, sans être hérité par les anciennes entreprises.
---

Le rapport des ventes nécessite sa propre autorisation E-commerce. Les portées legacy sans sélection explicite ne doivent pas l’autoriser, et les anciens packs ne doivent pas lui donner accès implicitement. Le droit de l’entreprise et le droit de lecture du rôle restent deux contrôles distincts; les sources restent limitées aux fonctionnalités de vente activées.

**Why:** le rapport agrège des données de ventes, donc l’évolution d’un pack ne doit pas étendre silencieusement l’accès des entreprises déjà configurées.

**How to apply:** garder le rapport opt-in via un pack dédié ou une sélection explicite, filtrer le menu par les droits effectifs et tester l’API aux niveaux entreprise, rôle et source.