# 🚗 Covoiturage — Qui conduit aujourd'hui ?

## Ouvrir le logiciel
Double-clique sur **`index.html`** : il s'ouvre dans ton navigateur (Chrome, Edge, Firefox…).
Rien à installer, pas besoin d'Internet.

## Première utilisation
Dans le cadre **« Les personnes »**, remplace « Personne 1 », « Personne 2 »… par vos prénoms.

## Chaque semaine : le planning (avant lundi)
1. En haut, dans **« Planning de la semaine »**, choisis la semaine avec les flèches ◀ ▶
   (à partir du vendredi, le logiciel propose directement la semaine suivante).
2. Clique sur les cases pour indiquer **qui vient quel jour**. Chaque clic change la case :
   **— (absent) → A/R (aller-retour) → Aller → Retour → —**. 🚗 = conducteur.
3. Les conducteurs sont calculés **jour après jour** : chaque jour tient compte des précédents.
   Le conducteur est toujours choisi parmi les personnes en **A/R** (c'est sa voiture).
   Si personne ne fait l'aller-retour un jour, le logiciel l'indique : pas de conducteur possible.
   ★ indique le conducteur proposé. Tu peux en choisir un autre dans la liste,
   et les jours suivants se recalculent.
4. La colonne **« Score avant → après »** montre l'évolution de chacun sur la semaine.
5. Clique sur **« Enregistrer le planning de la semaine »**.
6. Clique sur **« Copier le texte »** et colle-le dans votre groupe (WhatsApp, SMS, mail…).
   Le nom du conducteur est entouré d'étoiles (`*Yves*`) : WhatsApp l'affiche **en gras**.

Un imprévu en cours de semaine ? Reviens sur le planning, change la case, et enregistre à nouveau
(ou corrige la journée dans le cadre « Nouvelle journée », voir ci-dessous).

## Une journée isolée (imprévue ou oubliée)
1. Vérifie la **date** (le logiciel propose le prochain jour de semaine pas encore saisi).
2. Pour chaque personne, choisis **Absent(e), Aller-retour, Aller seulement ou Retour seulement**.
3. Le logiciel affiche **qui doit conduire**.
4. En cas d'imprévu, choisis un autre conducteur dans la liste.
5. Clique sur **« Enregistrer la journée »**.

Une erreur ? Dans ce même cadre, **choisis la date de la journée déjà enregistrée** : elle s'affiche pour être
**modifiée**, ou **supprimée** avec le bouton « Supprimer cette journée ». Les scores se recalculent tout seuls.

## « Qui a fait quoi ? »
Pour chaque personne, une barre montre le nombre de jours comme **conducteur** (bleu) et comme **passager** (orange).
La longueur totale de la barre = le nombre de jours de **covoiturage** (au moins 2 personnes dans la voiture).
Un aller-retour compte pour 1 jour, un aller ou un retour seul pour ½.
Passe la souris (ou touche, sur téléphone) une barre pour voir le détail. Le tableau en dessous donne les mêmes chiffres,
plus le **% conducteur** : la part des covoiturages où la personne conduisait.

## Les deux systèmes de points
En haut du planning, la liste **« Système de points »** permet de choisir. Le choix est mémorisé
(et inclus dans les sauvegardes exportées). Tout est recalculé à partir de l'historique, on peut changer à tout moment.

**1 point par passager** : pour un aller-retour, chaque passager **−1** et le conducteur **+1 par passager**
(moitié pour un aller ou un retour seul : passager −½, conducteur +½ par passager).

**Partage à 12 points** (expliqué ci-dessous) :
**L'aller et le retour comptent séparément** : chacun vaut **12 points**, partagés entre les personnes de ce trajet.
Quelqu'un qui ne fait que l'aller ne « paie » donc que l'aller (la moitié d'un aller-retour).

| Personnes dans le trajet | Conducteur | Chaque passager |
|---|---|---|
| 2 | +6 | −6 |
| 3 | +8 | −4 |
| 4 | +9 | −3 |
| 1 (seul) | 0 | — |

Le conducteur fait toujours l'aller **et** le retour.
Parmi les personnes en aller-retour, **celle qui a le score le plus bas conduit**.

Exemple : Anne et Bruno font l'aller-retour, Chloé seulement l'aller, David seulement le retour.
Aller = 3 personnes, retour = 3 personnes. Anne conduit : **+8 +8 = +16** ;
Bruno **−4 −4 = −8** ; Chloé **−4** ; David **−4**.

En cas d'égalité : la personne qui a conduit il y a le plus longtemps, puis l'ordre alphabétique.
La somme de tous les scores fait toujours 0.

Les journées enregistrées avant cette version sont automatiquement considérées comme des aller-retour.

## Sauvegarde
Les données sont enregistrées **dans le navigateur de cet ordinateur**.
⚠️ Si tu vides l'historique du navigateur ou changes d'ordinateur, elles peuvent être perdues :
clique régulièrement sur **« Exporter »** pour garder une copie (fichier `.json`),
et sur **« Importer »** pour la récupérer.

## Sur téléphone Android
L'application est en ligne à l'adresse `https://<ton-compte>.github.io/covoiturage/`.

**Installer**
1. Ouvre cette adresse dans **Chrome** sur le téléphone.
2. Touche le menu **⋮** (en haut à droite) → **« Installer l'application »**
   (ou **« Ajouter à l'écran d'accueil »**).
3. L'icône 🚗 « Covoiturage » apparaît sur l'écran d'accueil. Elle s'ouvre en plein écran,
   et fonctionne même **sans Internet**.

**Récupérer les données du PC**
1. Sur le PC : **Exporter** → un fichier `covoiturage-AAAA-MM-JJ.json` est créé.
2. Envoie ce fichier sur le téléphone (mail à toi-même, câble USB, Google Drive…).
3. Sur le téléphone, dans l'application : **Importer un fichier** → choisis le fichier.

⚠️ Le PC et le téléphone ont **chacun leurs propres données** : ce que tu saisis sur l'un
n'apparaît pas sur l'autre. Utilise Exporter / Importer pour passer de l'un à l'autre.

**Partager le planning** : le bouton **« Partager… »** envoie le texte directement dans WhatsApp, SMS, mail…

**Mises à jour** : quand le programme est modifié et renvoyé sur GitHub, l'application du téléphone
se met à jour toute seule (il peut falloir la fermer et la rouvrir une fois). Tes données ne sont pas touchées.

**Ce qui est publié sur GitHub** : uniquement le programme. Les prénoms, les présences et l'historique
restent dans le téléphone (et le dossier `input/` ainsi que les fichiers `.json` ne sont jamais envoyés).

## Les fichiers
- `index.html` : la page (ce que tu vois)
- `app.js` : les calculs (points, choix du conducteur, sauvegarde)
- `manifest.webmanifest`, `sw.js`, `icons/` : ce qui rend l'application installable sur téléphone
