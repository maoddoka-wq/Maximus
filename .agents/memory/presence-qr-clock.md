---
name: Pointage par QR code
description: Règle métier du pointage Présences entre le compte gestionnaire et les comptes employés
---

Le compte gestionnaire des Présences affiche l’heure, la date active et un QR code signé pour l’entreprise. Un compte employé ne choisit jamais un collègue et ne pointe pas directement avec un identifiant envoyé par le navigateur : il scanne le QR du gestionnaire avec son propre compte. Le serveur déduit alors l’employé depuis la session et applique la séquence arrivée puis sortie.

**Why:** Le pointage doit représenter la présence physique dans l’entreprise tout en empêchant un employé de pointer pour une autre personne.

**How to apply:** Toute évolution du pointage doit conserver une validation serveur du QR, de l’entreprise, de son expiration et de l’identité employé issue de la session ; l’interface gestionnaire et l’interface employé restent distinctes.