# 🎯 JobPulse — Personal Applicant Tracking System (ATS)

> Un système de suivi de candidatures sur-mesure, réactif et accessible, conçu pour remplacer les tableaux Excel et optimiser sa recherche d'emploi ou d'alternance.

---

## 📌 Présentation du projet

**JobPulse** (commercialisé sous le nom **TrackMyApply**) est une application web Full Stack développée pour centraliser, structurer et automatiser l'intégralité d'une recherche professionnelle. Elle permet à un candidat de garder le contrôle sur ses opportunités, d'analyser l'efficacité de ses démarches et de ne rater aucun timing stratégique de relance.

---

## ✨ Fonctionnalités Principales

### 🚀 1. Authentification Express & Onboarding Personnalisé

- **Inscription Express (Fast Registration) :** Création de compte ultra-rapide nécessitant uniquement un Email et un Mot de passe sécurisé (haché via `bcrypt`). Génération immédiate d'un jeton de session (`JWT`) pour connecter l'utilisateur instantanément.
- **Questionnaire d'Onboarding Interactif (Post-Inscription) :** Parcours guidé présenté dès la première connexion (mode _wizard_) avec système d'étiquettes (_tags_) et champs personnalisables pour définir :
  - Niveau d'études & diplôme actuel (ex : _Mastère Dev Manager Full Stack_).
  - Domaine de recherche principal (ex : _Développement Full-Stack_).
  - Type de contrat recherché (_Alternance, Stage, CDI..._).
  - Durée du contrat & rythme d'alternance (ex : _2 semaines en entreprise / 1 semaine à l'école_).
  - Zone géographique cible (ville, rayon, télétravail).
- **Gestion Dynamique de l'État Utilisateur (`isOnboarded`) :** Suivi de l'état d'onboarding en BDD (`isOnboarded: false` par défaut). Redirection automatique de l'utilisateur vers le questionnaire s'il n'a pas configuré son profil, ou vers son tableau de bord s'il l'a déjà complété.
- **Initialisation du Scraping sur-mesure :** Stockage centralisé des préférences dans un objet `profile` relié à l'utilisateur, réutilisé directement pour paramétrer et filtrer automatiquement le module de web scraping.

### 📋 2. Suivi CRUD Complet des Candidatures

- **Gestion centralisée :** Création, lecture, mise à jour et suppression des fiches de candidatures.
- **Informations détaillées :** Nom de l'entreprise, intitulé du poste, type de contrat, prétentions salariales, lieu, canal d'origine (LinkedIn, Indeed, WTTJ, Spontané) et statut.
- **Filtres & Recherche instantanée :** Filtrage dynamique par mot-clé, statut (_Postulé, Entretien, À relancer, Offre reçue, Refusé_) ou canal.

### 📂 3. Espace Documentaire Intégré

- **Traçabilité des versions :** Association directe de la version exacte du **CV** et de la **Lettre de Motivation** envoyés à chaque entreprise.
- **Gestion multi-fichiers :** Stockage et prévisualisation des pièces jointes associées aux fiches candidatures.

### ⏳ 4. Timeline Chronologique (Journal de bord par entreprise)

- **Historique des échanges :** Suivi étape par étape des interactions (appels téléphoniques, entretiens RH, tests techniques, entretiens managers).
- **Prise de notes à chaud :** Enregistrement des comptes-rendus, questions posées et coordonnées directes des interlocuteurs / recruteurs.

### 📊 5. Tableau de Bord & KPIs Temps Réel

- **Indicateurs clés de performance :**
  - Nombre total de candidatures actives.
  - Nombre d'entretiens programmés.
  - Taux de réponse global (%).
  - Nombre d'offres reçues.
- **Analyse par canal :** Visualisation de l'efficacité des différentes plateformes de recrutement pour concentrer ses efforts sur les plus rentables.

### ⏰ 6. Alertes Intelligentes & Filtre "À Relancer"

- **Automatisation des échéances :** Calcul automatique des dates de relance recommandées ($J+7$ ou $J+10$).
- **Notification prioritaire :** Un encart dédié regroupe les entreprises nécessitant une prise de contact urgente avec un bouton d'action rapide pour générer un message de relance.

### ⚙️ Modules Bonus

- **🕷️ Agrégateur & Scraper d'Offres Sur-Mesure :** Récupération automatique d'opportunités en temps réel via des flux JSON/RSS et APIs externes (Adzuna, Remotive, WTTJ) alimentée directement par les critères définis lors de l'onboarding. Importation en 1-clic vers le tableau de suivi.
- **🤖 Assistant & Scoring IA :** Analyse de la fiche de poste, calcul d'un score d'adéquation (_Match Score %_), extraction des compétences manquantes et aide à la préparation d'entretiens.

---

## 🎨 Design System & Accessibilité

L'interface a été conçue autour d'une charte visuelle chaleureuse, apaisante et conforme aux normes d'accessibilité **WCAG** (contraste élevé, typographies à forte lisibilité) :

- **Fond Canvas :** Beige mat doux (`#F7F5F0`) réduisant la fatigue visuelle.
- **Couleur Primaire & Navigation :** Vert sapin profond (`#1E463E`).
- **Accents & Alertes :** Orange terre cuite (`#D96C4A`).
- **Cartes & Conteneurs :** Crème surélevé (`#FCFAF7`) avec coins arrondis (`12px` / `16px`).
- **Typographie :** _DM Sans_ / _Inter_.

---

## 🛠 Architecture Technique & Stack

L'application repose sur une architecture 100 % JavaScript moderne, sécurisée et découplée :

### Backend (API REST)

- **Runtime :** Node.js
- **Framework :** Express.js
- **Base de données :** MongoDB avec Mongoose ODM
- **Sécurité :** Authentification par Tokens **JWT** (JSON Web Tokens), hachage des mots de passe avec **bcrypt**, validation des entrées et isolation stricte des données par utilisateur.
- **Documentation & Tests :** Swagger / OpenAPI, Jest & Supertest.

### Frontend (SPA Réactive)

- **Framework :** React (Vite)
- **Styling :** Tailwind CSS (Configuration de thème personnalisée & variables CSS / shadcn/ui preset)
- **Icons :** Lucide React

---

## 🗄 Modèle de Données (MongoDB)

L'application s'articule autour de 5 collections principales :

```text
├── users               # Comptes utilisateurs, statut isOnboarded & profil de préférences (scraping)
├── applications        # Fiches de candidatures (Suivi CRUD, statuts, dates de relance)
├── documents          # Fichiers CVs & Lettres de motivation
├── timeline_events    # Événements chronologiques (Entretiens, appels, tests)
└── scraped_jobs       # Flux d'offres d'emploi agrégées basées sur les critères d'onboarding
```

### Extrait du schéma `User` mis à jour

```javascript
const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    isOnboarded: { type: Boolean, default: false }, // Gestion d'état pour la redirection
    profile: {
      firstName: String,
      lastName: String,
      educationLevel: String, // ex: "Mastère Dev Manager Full Stack"
      targetDomain: String, // ex: "Développement Full-Stack"
      contractType: String, // ex: "Alternance"
      rhythm: String, // ex: "2 sem. entreprise / 1 sem. école"
      targetLocations: [String], // ex: ["Paris", "Remote"]
    },
  },
  { timestamps: true },
);
```

---

## 🚀 Installation & Démarrage Rapide

### Prérequis

- **Node.js** (v18 ou supérieur)
- **MongoDB** (Instance locale ou MongoDB Atlas)
- **pnpm** ou **yarn**

### 1. Cloner le projet

```bash
git clone https://github.com/votre-user/jobpulse.git
cd jobpulse
```

### 2. Configuration du Backend

```bash
cd backend
pnpm install
```

Créer un fichier `.env` dans le dossier `backend` :

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/jobpulse
JWT_SECRET=votre_secret_jwt_ultra_securise
NODE_ENV=development
```

Démarrer le serveur backend :

```bash
pnpm run dev
```

### 3. Configuration du Frontend

```bash
cd ../frontend
pnpm install
pnpm run dev
```

L'application frontend sera accessible sur `http://localhost:5173`.

---

## 📖 Documentation API & Tests

- **Swagger UI :** La documentation de l'API REST est accessible une fois le serveur lancé à l'adresse : `http://localhost:5000/api-docs`
- **Lancer les tests automatisés :**
  ```bash
  cd Back-end
  pnpm run test
  ```
- **Lancer uniquement les tests d'authentification :**
  ```bash
  pnpm run test:auth
  ```
- **Tests d'authentification actuellement couverts :**
  - Refus d'une requête protégée lorsque le token JWT est absent.
  - Refus d'une requête protégée lorsque le token JWT est invalide.
  - Acceptation d'un token JWT valide et transmission de l'identifiant utilisateur au middleware suivant.
  - Refus d'un nouveau mot de passe de moins de 8 caractères.
  - Refus d'un code de réinitialisation de mot de passe invalide.
- **Lancer uniquement les tests du CRUD des candidatures :**
  ```bash
  pnpm run test:applications
  ```
- **Tests du CRUD des candidatures actuellement couverts :**
  - Création : refus sans entreprise ou sans poste, détection des doublons (409, y compris via l'URL de l'offre), rattachement à l'utilisateur et timeline initiale.
  - Lecture : liste des candidatures de l'utilisateur triées de la plus récente à la plus ancienne, lecture d'une candidature par identifiant, 404 si elle est introuvable.
  - Modification : seuls les champs autorisés sont modifiés, une entrée de timeline est ajoutée lors d'un changement de statut.
  - Suppression : suppression limitée aux candidatures de l'utilisateur, 404 si elle est introuvable.
- **Lancer uniquement les tests du CRUD des documents :**
  ```bash
  pnpm run test:documents
  ```
- Les tests utilisent **Jest** avec l'environnement Node.js et appellent directement les contrôleurs avec des modèles mockés (aucune base de données requise). Ils sont situés dans `Back-end/test/auth.test.js`, `Back-end/test/application.test.js` et `Back-end/test/document.test.js`.

---

## 👤 Auteur

Projet conçu et développé par **Enzo** dans le cadre du module de développement Full Stack et de la recherche d'alternance.
