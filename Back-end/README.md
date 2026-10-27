# 🎯 JobPulse — API Backend

> API REST pour gérer les comptes utilisateurs et suivre les candidatures à des offres d’emploi ou d’alternance.

---

## 📌 Présentation du projet

JobPulse (également appelé TrackMyApply) aide à centraliser le suivi des candidatures. Ce dossier contient le backend : un serveur Express connecté à MongoDB qui fournit des routes d’authentification et de gestion des candidatures.

---

## ✨ Fonctionnalités disponibles

### 🔐 1. Création de compte et connexion

- Inscription avec une adresse e-mail et un mot de passe.
- Hachage du mot de passe avec `bcrypt` avant son enregistrement.
- Connexion et émission d’un jeton JWT valable 7 jours.
- Conservation dans le modèle utilisateur d’un état `isOnboarded` et de champs de profil.

### 📋 2. Gestion des candidatures

- Création, consultation, modification et suppression des candidatures.
- Informations enregistrées : entreprise, poste, ville, canal de candidature, lien de l’offre, statut, dates et coordonnées du contact.
- Chaque candidature est rattachée à l’utilisateur connecté.
- Les routes de candidature nécessitent un jeton JWT valide.

Les statuts acceptés sont `postulé`, `en attente`, `entretien prévu`, `entretien`, `relance faite` et `refusé`.

### ❤️ 3. Vérification du serveur

- Une route de santé permet de vérifier que l’API répond : `GET /api/health`.

---

## 🛠 Architecture technique & stack

- **Runtime :** Node.js
- **Framework API :** Express 5
- **Base de données :** MongoDB avec Mongoose
- **Authentification :** JSON Web Tokens (`jsonwebtoken`)
- **Hachage des mots de passe :** `bcrypt`
- **Configuration :** variables d’environnement avec `dotenv`
- **Dépendances :** pnpm

---

## 🗄 Modèles de données MongoDB

Le backend définit actuellement deux modèles :

```text
├── users         # E-mail, mot de passe haché, état d’onboarding et profil
└── applications  # Candidatures liées à leur utilisateur
```

Le modèle `User` comprend l’e-mail, le mot de passe, `isOnboarded` et des champs de profil tels que le niveau d’études, le domaine recherché, le type et la durée du contrat, le rythme et la localisation.

Le modèle `Application` comprend les informations de l’offre et du contact, son statut, les dates de candidature et de relance, ainsi que la référence à l’utilisateur propriétaire.

---

## 🚀 Installation & démarrage

### Prérequis

- Node.js
- pnpm (`12.15.0`, version déclarée par le projet)
- MongoDB local ou distant

### 1. Installer les dépendances

Depuis la racine du dépôt :

```bash
cd Back-end
pnpm install
```

### 2. Configurer les variables d’environnement

Créer un fichier `.env` dans le dossier `Back-end` :

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/jobpulse
JWT_SECRET=remplacez_par_une_cle_secrete_longue_et_aleatoire
```

`MONGO_URI` doit correspondre à une instance MongoDB accessible. Définissez une valeur secrète forte pour `JWT_SECRET` et ne partagez pas le fichier `.env`.

### 3. Démarrer l’API

En développement, avec redémarrage automatique :

```bash
pnpm dev
```

Pour démarrer le serveur normalement :

```bash
pnpm start
```

L’API écoute par défaut sur `http://localhost:5000`. Le serveur attend la connexion à MongoDB avant de démarrer.

---

## 📖 Routes de l’API

Toutes les requêtes avec un corps doivent envoyer du JSON (`Content-Type: application/json`).

### Santé

| Méthode | Route | Description |
| --- | --- | --- |
| `GET` | `/api/health` | Vérifie que le serveur répond |

Réponse :

```json
{ "status": "ok" }
```

### Authentification

| Méthode | Route | Corps attendu | Description |
| --- | --- | --- | --- |
| `POST` | `/api/auth/register` | `email`, `password` | Crée un compte et renvoie un JWT |
| `POST` | `/api/auth/login` | `email`, `password` | Authentifie un utilisateur et renvoie un JWT |

Exemple de corps :

```json
{
  "email": "candidat@example.com",
  "password": "un-mot-de-passe"
}
```

### Candidatures

Toutes les routes ci-dessous nécessitent l’en-tête d’authentification suivant :

```text
Authorization: Bearer <token>
```

| Méthode | Route | Description |
| --- | --- | --- |
| `GET` | `/api/applications` | Liste les candidatures de l’utilisateur connecté |
| `POST` | `/api/applications` | Crée une candidature |
| `GET` | `/api/applications/:id` | Récupère une candidature par son identifiant |
| `PUT` | `/api/applications/:id` | Modifie une candidature |
| `DELETE` | `/api/applications/:id` | Supprime une candidature |

À la création, les champs `company` et `position` sont obligatoires. Les autres champs disponibles incluent `city`, `address`, `commuteTime`, `channel`, `jobUrl`, `status`, `applicationDate`, `nextFollowUpDate` et `contact` (`name`, `email`, `phone`).

---

## 🧪 Scripts et tests

| Commande | Description |
| --- | --- |
| `pnpm dev` | Démarre l’API avec nodemon |
| `pnpm start` | Démarre l’API avec Node.js |
| `pnpm test` | Exécute la suite de tests Jest |
| `pnpm test:auth` | Exécute les tests unitaires d’authentification |

La documentation Swagger/OpenAPI n’est pas encore configurée dans ce backend.

Les tests d’authentification utilisent Jest avec des mocks de MongoDB et de
`bcrypt`. Ils couvrent les tokens JWT, l’inscription, la connexion, la
réinitialisation et le changement de mot de passe, ainsi que l’onboarding et
la mise à jour du profil.
