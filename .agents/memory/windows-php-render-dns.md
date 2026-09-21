---
name: DNS Render depuis PHP Windows
description: Comportement à prendre en compte quand PHP cURL Windows ne résout pas Render alors que curl.exe y accède.
---

Sur certaines installations Windows, PHP cURL peut expirer pendant la résolution DNS de l’hôte Render, alors que `curl.exe` atteint la même URL. Les synchronisations centrales doivent préférer IPv4 et réessayer les erreurs de connexion transitoires.

**Why:** Le résolveur utilisé par PHP cURL peut se comporter différemment du client curl Windows et produire une expiration DNS avant même que l’API centrale reçoive la requête.

**How to apply:** Pour les appels HTTP des installations Windows vers Render, conserver une résolution IPv4 forcée et un retry limité aux exceptions de connexion ; ne pas traiter les réponses HTTP 401/403/5xx comme des erreurs DNS.