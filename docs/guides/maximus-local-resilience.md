# MAXIMUS dédié / local : continuité et récupération

Ce guide concerne Laravel en mode `dedicated` ou `on_premise`. Il ne décrit pas une
installation centrale ni un service Windows automatiquement installé.

## Enrôlement initial et démarrages suivants

Le premier enrôlement nécessite MAXIMUS principal joignable, un bootstrap privé
et une archive du **même commit** que le bootstrap et le serveur central.
`MAXIMUS_INSTALLATION_ID` et `MAXIMUS_INSTALLATION_COMPANY_ID` doivent correspondre
à la réponse centrale. Le protocole de synchronisation doit aussi correspondre.
Ne pas modifier ces identifiants pour contourner un échec.

Après ce premier succès, les utilisateurs s'authentifient dans la base locale :
aucune authentification centrale quotidienne, aucun délai d'expiration hors
ligne. Relancer `maximus:install-company` sur une installation déjà initialisée
conserve l'administrateur, ses sessions et sa configuration sans appel central.
Le mot de passe initial du bootstrap n'écrase pas un mot de passe récupéré.

Une synchronisation ultérieure peut accepter un commit central différent si le
`syncProtocolVersion` reste compatible. L'identité entreprise/installation reste
strictement vérifiée ; `versionWarning` signale la différence. Cela ne remplace
pas les procédures de mise à jour manuelle du logiciel.

## Politique hors ligne et état local

Les modules, permissions et la marque validés sont conservés en base locale.
Les employés, mots de passe, sessions et données métier ne sont pas synchronisés
avec le serveur central. Une panne réseau ne supprime aucune donnée et ne bloque
pas la connexion locale. Les changements centraux ne sont connus localement
qu'après une synchronisation réussie : ce compromis doit être accepté par
l'exploitant pour les révocations de modules/domaines.

`App\Support\InstallationSyncState::summary()` expose uniquement :

- `lastAttemptAt`, `lastSuccessAt` (dates ISO 8601) ;
- `state` : `never_synced`, `syncing`, `synced`, `unreachable`, `revoked`,
  `authentication_rejected`, `rejected` ou `storage_error` ;
- `lastError` : message opérationnel nettoyé, sans jeton ni corps de réponse ;
- `versionWarning` : différence de versions applicatives après un succès.

`InstallationSyncState::erpAccess()` retourne
`{canonicalUrl: string|null, allowedHosts: string[]}` pour cette installation
uniquement. Le fichier de statut est privé, sous
`storage/app/installation-sync/`, avec une clé dérivée des deux identifiants et du mode.
Il ne contient ni mot de passe, ni jeton, ni données métier. Le fichier et son
répertoire doivent rester inscriptibles par le compte PHP, hors document root ;
sur Windows, configurer les ACL NTFS, les permissions POSIX ne suffisent pas.

Le remplacement du fichier est atomique et intervient **après** le succès de la
transaction de configuration SQL. Si le processus s'arrête entre le commit SQL
et la publication du fichier, la précédente liste d'hôtes reste publiée ; la
prochaine synchronisation réapplique l'état de façon idempotente. Sauvegarder
ensemble la base, le stockage et la configuration serveur. Un état absent ou
corrompu exige une vérification opérateur/un nouvel enrôlement strict, pas une
validation de version affaiblie.

Une réponse explicite `code=INSTALLATION_REVOKED` produit `revoked`. Une simple
réponse 401/403 ambiguë produit `authentication_rejected`, jamais une fausse panne
réseau. Une erreur réseau, 5xx, 408 ou 429 produit `unreachable`. La révocation
concerne l'enrôlement de synchronisation : elle est visible mais ne détruit pas
la base ni ne constitue un interrupteur de connexion locale. Traiter une
révocation avec l'administrateur central, ne pas supprimer le fichier d'état.

## Marque, logo et adresses ERP

Les couleurs explicites valides du serveur central sont appliquées, et les
couleurs absentes ne remettent pas la marque à zéro. Les préférences locales de
connexion personnalisée sont conservées. La connexion racine d'une installation
entreprise n'est pas conditionnée par le drapeau central de login personnalisé.

**Limite volontaire du logo :** une URL de photo centrale ne prouve pas que ses
octets existent localement. La synchronisation ne télécharge aucune URL de média,
ne copie pas un chemin relatif central et conserve la photo locale et ses octets.
En l'absence de photo locale, le profil reste sans photo (initiales affichées).
Importer le logo par le formulaire local de photo d'entreprise, qui stocke le
chemin public propre à l'entreprise, les octets et le type MIME. Cela évite SSRF,
redirections non contrôlées et images cassées/hors ligne.

Les adresses ERP validées sont distinctes des domaines de boutiques e-commerce.
Un alias persistant appartient à une entreprise ET à une installation. Garder
`APP_URL` réglé sur l'adresse réelle de démarrage/récupération ; le contrôle
d'hôtes conserve cet hôte serveur comme point d'accès indépendant des alias.
Une entrée `hosts` ou DNS ne constitue pas à elle seule une validation centrale.

## Synchronisation planifiée, pas mise à jour automatique

La tâche Laravel `maximus:sync-central-installation` est définie toutes les
5 minutes, sans chevauchement (verrou expirant après 60 minutes), uniquement en
mode entreprise. Un échec est retenté à l'échéance suivante, sans boucle agressive.
Les scripts d'installation et de mise à jour enregistrent automatiquement le
déclencheur du scheduler :

```sh
./scripts/register-maximus-sync.sh
```

Sous Windows, le même script est disponible en PowerShell :

```powershell
.\scripts\register-maximus-sync.ps1
```

Le déclencheur système appelle `schedule:run` toutes les 5 minutes, comme la
fréquence de synchronisation Laravel. Le scheduler peut aussi être lancé au
premier plan par l'exploitant :

```sh
cd artifacts/api-server/laravel
php artisan schedule:work
```

Pour supprimer le déclencheur POSIX :

```sh
./scripts/register-maximus-sync.sh --remove
```

Pour un essai manuel :

```sh
php artisan maximus:sync-central-installation
```

Cela ne fait ni `git pull`, ni build, ni migration, ni redémarrage applicatif.
Ce guide ne configure pas les anciens scripts de mise à jour automatique.
Si une ancienne tâche d'auto-update existe déjà sur un poste, la désactiver
explicitement avec son administrateur ; cette livraison ne la désinstalle pas.

## Récupérer un administrateur sans Internet

Un administrateur système doit ouvrir un terminal interactif de confiance sur
la machine hébergeant **cette instance**, avec le compte autorisé à sa base :

```sh
cd artifacts/api-server/laravel
php artisan maximus:recover-admin
```

Saisir l'email d'un `company_admin` existant de l'entreprise configurée, puis un
nouveau mot de passe de 12 à 72 octets, deux fois. La saisie est masquée ; si le
terminal ne sait pas masquer, la commande n'utilise pas de saisie visible.
Ne jamais placer le mot de passe dans une ligne de commande, un fichier shell,
une variable d'environnement ou un ticket de support. `--no-interaction` est
refusé. Ne pas enregistrer la session terminal.

La commande remplace uniquement le hash de ce compte et révoque toutes ses
sessions, dans la même transaction. Elle ne crée/promeut aucun compte, ne touche
ni l'administrateur MAXIMUS global, ni une autre entreprise et n'appelle aucun
serveur distant. Elle ne réactive pas un compte suspendu et ne modifie aucun
rôle. Il n'existe pas de reset public correspondant ; la page d'aide locale
renvoie l'utilisateur vers son administrateur système et cette commande.

## Démarrer localement sous Windows

Installer PHP et ses extensions, Composer, PostgreSQL, les dépendances Composer
et le frontend compilé dans `artifacts/api-server/laravel/public`. Depuis la
racine du dépôt, dans PowerShell :

```powershell
.\scripts\start-maximus-local.ps1
# Autre port si nécessaire :
.\scripts\start-maximus-local.ps1 -Port 8081
```

Le script résout les chemins absolus, utilise **public comme document root** et
le routeur MAXIMUS `artifacts/api-server/laravel/server.php` du dépôt (et non le
routeur générique de Composer, qui n’ouvre pas l’application React). PHP est
résolu depuis PATH ou `$HOME\php\php.exe`, ou fourni avec `-PhpExecutable`.
Il fonctionne indépendamment
du dossier courant et des espaces dans le chemin. Il reste au premier plan :
fermer le terminal ou Ctrl+C arrête PHP. Ce n'est pas un service de production
et aucun démarrage au boot n'est promis. Un accès LAN demande une adresse
d'écoute explicite, un pare-feu et une configuration d'hôte adaptée ; ne pas
exposer ce serveur de développement à Internet.

Les builds Git Bash des scripts d'installation/mise à jour excluent
`BASE_PATH` de la conversion MSYS (`MSYS2_ENV_CONV_EXCL=BASE_PATH`,
`MSYS2_ARG_CONV_EXCL=*`, `MSYS_NO_PATHCONV=1`). Cela évite que `/` devienne un
chemin Windows dans les URLs des assets. Recompiler et recopier `dist/public`
si un ancien build contient déjà des chemins `C:/...`.

## DNS, TLS et exploitation : prérequis externes

### Choisir l’accès principal des employés

Dans la fiche de l’entreprise, « Accès ERP et installations » sépare l’accès
mutualisé des installations de test, dédiées ou locales. Créer une installation
ne bascule pas les comptes existants. Une fois son adresse principale active,
ses comptes locaux créés et leur connexion vérifiée, l’administrateur MAXIMUS
peut confirmer « Définir comme accès ERP principal ».

Cette action bloque l’utilisation des comptes entreprise sur le service central,
y compris les sessions existantes, sans supprimer les comptes ni leurs données.
L’administration globale MAXIMUS reste disponible. Une action explicite permet
de rétablir l’accès mutualisé ; une panne réseau ou une révocation du jeton ne le
rétablit pas automatiquement. Cette bascule ne transfère ni les mots de passe ni
les données métier : préparer et valider l’installation avant confirmation.

### Raccordement réseau

Pour un nom de domaine public, l'exploitant doit configurer DNS A/AAAA/CNAME vers
le reverse proxy réel, les preuves de propriété demandées, NAT/pare-feu, le
virtual host, les certificats TLS et leur renouvellement. L'application ne
configure pas le DNS du registrar, n'émet pas de certificat et ne crée pas de
service Windows. En réseau isolé, le DNS interne (ou fichier `hosts`) et une
autorité TLS de confiance sont aussi des responsabilités externes. Ne pas
désactiver la vérification TLS pour contourner une erreur.

En production utiliser un serveur HTTP/PHP-FPM adapté, document root `public`,
des sauvegardes PostgreSQL et de stockage, une supervision et une procédure de
restauration. Les tests de régression inclus utilisent SQLite en mémoire,
HTTP simulé et stockage temporaire ; ils ne remplacent pas une recette Windows
réelle ou une validation de parité PostgreSQL.