# BMF — Votre solution de jeux

BMF est une plateforme web moderne, rapide et optimisée PWA pour l’achat de recharges Free Fire (Player ID / UID) et de cartes cadeaux numériques. Elle met aussi en place un hub gaming alimenté automatiquement par un moteur IA open source inspiré de Llama 3 via Groq.

## Fonctionnalités principales

- Boutique de recharges Free Fire avec saisie du Player ID / UID
- Achat de cartes cadeaux Google Play, iTunes et autres plateformes
- Tableau de bord client avec historique des commandes
- Espace joueur avec barre de navigation fixe, notifications de livraison et sondages
- Back office admin pour validation des paiements, gestion des codes numériques et création de sondages
- Hub gaming IA avec articles en statut draft pour modération
- Design gaming dark mode, responsive et compatible PWA

## Stack technique

- Next.js 16 + TypeScript + Tailwind CSS
- App Router
- PWA via manifest Next.js
- Supabase-ready client configuration
- IA demo via module Groq / Llama 3 mocké pour le projet

## Démarrage local

```bash
npm install
npm run dev
```

Ensuite ouvrez : http://localhost:3000

## Variables d’environnement

Copiez `.env.example` vers `.env.local` et complétez les valeurs :

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_MONCASH_RECEIVER=
NEXT_PUBLIC_NATCASH_RECEIVER=
GROQ_API_KEY=
GROQ_VISION_MODEL=qwen/qwen3.8-27b
```

## Supabase et paiements

1. Exécutez `supabase-schema.sql` dans l’éditeur SQL du projet Supabase. Après une mise à jour de l’application, réexécutez ce script pour installer les nouvelles politiques RLS, notamment celles qui autorisent les administrateurs à gérer les catalogues. Le script crée `public.profiles`, les configurations de paiement, les tables de trafic, les politiques RLS et les buckets privés `payment-proofs` et `merchant-qrs`. Les catalogues sont lus depuis Supabase et aucun catalogue local n’est utilisé comme secours.
2. Si les données de démonstration historiques apparaissent encore, exécutez une fois `supabase-remove-demo-data.sql`. Il supprime uniquement les entrées de démonstration identifiées et préserve les autres lignes.
3. Créez votre compte via `/register`, puis attribuez le rôle admin depuis l’éditeur SQL Supabase en remplaçant l’adresse :

  ```sql
  update public.profiles set role = 'admin' where email = 'admin@example.com';
  ```

4. Ouvrez `/admin/payments` et configurez, pour chaque fournisseur, le numéro de réception, le QR officiel ou les deux. Les variables `NEXT_PUBLIC_MONCASH_RECEIVER` et `NEXT_PUBLIC_NATCASH_RECEIVER` restent un fallback pour les paiements par numéro si aucune configuration de ce fournisseur n’a été créée.

5. Ouvrez `/admin/catalog` pour ajouter, modifier ou supprimer les packs de diamants Free Fire et les cartes cadeaux. Les prix saisis sont en gourdes haïtiennes (HTG) et les modifications sont enregistrées dans Supabase. L’archivage range une fiche dans `/admin/catalog-history` pour alléger la configuration admin, mais ne la désactive pas : elle reste visible et achetable par les joueurs, et disponible pour la gestion du stock. Les anciennes fiches portant le suffixe FCFA sont réétiquetées sans conversion de leur montant ; vérifiez et ajustez leurs prix dans le catalogue admin.

6. Ouvrez `/admin/stock` et associez à chaque offre ses codes PIN réels, un code par ligne. À la confirmation du paiement, un code de cette offre est attribué une seule fois et apparaît dans l’onglet **Commandes** du joueur. Si aucun code n’est disponible, le paiement reste confirmé et la livraison est signalée comme « stock attendu » ; l’ajout ultérieur de codes attribue automatiquement les commandes correspondantes.
7. Ouvrez `/admin/surveys` pour créer des questions et choix de réponse. Les joueurs connectés répondent depuis l’onglet **Sondages** et ne peuvent voter qu’une fois par sondage.

Le paiement reste un flux de transfert manuel : le client choisit MonCash/NatCash et numéro/QR, puis chaque commande reçoit une référence `BMF-MC-…` ou `BMF-NC-…`. Il fournit l’ID de transaction, son téléphone et une preuve JPG/PNG/WebP/PDF (5 Mo maximum). L’admin doit vérifier le reçu et le transfert dans le portefeuille marchand avant de confirmer `paid` ou de refuser. La vérification automatique via API MonCash/NatCash n’est pas activée ; elle nécessite les identifiants marchands et l’accès aux API/webhooks des fournisseurs. La livraison automatique décrite ci-dessus distribue le stock préchargé par l’admin ; elle ne crédite pas directement un compte Free Fire via UID.

Les routes d’administration et les opérations de commande vérifient le rôle Supabase côté serveur. Dans `/admin/events`, un administrateur fournit des consignes, des informations et éventuellement une image pour générer un brouillon. Configurez `GROQ_API_KEY` ; pour la génération avec image, le modèle Groq vision est configurable via `GROQ_VISION_MODEL`. Les brouillons et leurs images sont enregistrés dans Supabase puis peuvent être publiés manuellement. Aucun cron ni clé `service_role` n’est nécessaire.

Le dashboard `/admin` affiche les vues et visiteurs estimés aujourd’hui/30 jours, les visiteurs actifs dans les deux dernières minutes, les profils enregistrés et les montants des commandes explicitement confirmées `paid`. Le navigateur conserve un identifiant visiteur aléatoire dans son stockage local; les visites sont donc des estimations et peuvent être comptées à nouveau après effacement du stockage ou changement d’appareil. Les profils ne sont pas publiquement exposés.

## Structure de référence

```text
app/
  (auth)/login/page.tsx
  (auth)/register/page.tsx
  (shop)/topup/page.tsx
  (shop)/giftcards/page.tsx
  admin/orders/page.tsx
  admin/events/page.tsx
  manifest.ts
lib/
  ai/groq.ts
  supabase/client.ts
  data.ts
```

## Notes

La validation des commandes utilise Supabase Auth, des rôles `profiles`, des politiques RLS et des preuves de paiement stockées dans un bucket privé.
