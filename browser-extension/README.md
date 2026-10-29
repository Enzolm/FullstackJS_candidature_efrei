# TrackMyApply Browser Extension

Prototype Chrome Extension Manifest V3 avec Side Panel.

## Installation locale

1. Démarrer le backend sur `http://localhost:3000`.
2. Ouvrir `chrome://extensions`.
3. Activer le mode développeur.
4. Cliquer sur **Charger l’extension non empaquetée**.
5. Sélectionner le dossier `browser-extension`.
6. Cliquer sur l’icône de l’extension pour ouvrir le Side Panel.
7. Ouvrir TrackMyApply dans un onglet et se connecter avec son compte.
8. Dans le Side Panel, utiliser **Connexion rapide depuis le site** pour récupérer la session déjà ouverte.
9. Il est également possible de saisir directement son email et son mot de passe dans le formulaire de l’extension.

## Utilisation

Sur Gmail ou Indeed :

1. ouvrir le side panel ;
2. faire glisser un document vers une zone de dépôt si le site accepte le drag-and-drop externe ;
3. sinon cliquer sur **Utiliser sur la page** après avoir affiché la zone d'upload ;
4. le content script télécharge le fichier et l'injecte dans le premier `input[type="file"]`.

Le prototype ajoute aussi un bouton TrackMyApply flottant sur les sites ciblés.

Sur une page d’offre Indeed, le bouton **J’ai postulé à cette offre** lit le
titre du poste, l’entreprise, la localisation, la rémunération, le type de
contrat et l’URL de l’offre, puis crée directement une candidature
authentifiée dans TrackMyApply avec le canal **Indeed**, le statut **postulé**
et la date du jour. Si les informations
essentielles ne sont pas présentes dans la page, un message d’erreur est
affiché et aucune candidature partielle n’est créée.

La même action est disponible dans le Side Panel avec le bouton
**J’ai postulé à cette offre Indeed**. Le Side Panel utilise l’onglet actif,
ce qui permet d’enregistrer l’offre même si le bouton flottant de la page est
masqué.

## Limitation Chrome importante

Chrome isole le Side Panel de la page web. Le transfert direct d’un objet `File`
n’est donc pas garanti sur tous les sites. L’extension envoie un identifiant de
document dans `DataTransfer`, puis le content script télécharge le fichier et
injecte un événement `drop` avec un `DataTransfer` contenant le fichier.

Les sites qui bloquent les événements synthétiques ou utilisent un composant
entièrement encapsulé peuvent refuser cette méthode. Dans ce cas, il faut prévoir
un bouton de secours qui demande à l’utilisateur de choisir le fichier via
l’input natif du site.

L’extension propose deux modes de connexion : un formulaire autonome qui appelle
`POST /api/auth/login`, et une connexion rapide qui récupère le token déjà
présent dans la session TrackMyApply ouverte dans l’onglet local. Le pont lit
`localStorage` et `sessionStorage`, puis les tokens sont stockés dans
`chrome.storage.local`. Pour une version de production, il faudra remplacer ce
pont local et le stockage direct du token par un vrai flux OAuth ou un code de
liaison à usage unique, limiter les domaines autorisés et éviter de précharger
tous les fichiers volumineux.
