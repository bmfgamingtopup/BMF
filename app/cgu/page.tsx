import LegalShell from '../legal-shell';

function TermsSection({ title, children }: Readonly<{ title: string; children: React.ReactNode }>) {
  return (
    <section className="border-t border-white/10 pt-6">
      <h2 className="text-xl font-bold text-white">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-7 text-slate-300">{children}</div>
    </section>
  );
}

export default function TermsPage() {
  return (
    <LegalShell
      title="Conditions générales d’utilisation et de vente"
      intro="Les présentes conditions décrivent l’utilisation de BMF Top Up et le traitement des commandes de produits numériques proposés sur la plateforme."
    >
      <p className="text-xs text-slate-500">Dernière mise à jour : 28 septembre 2026</p>

      <TermsSection title="1. Objet et acceptation">
        <p>En naviguant sur le site ou en passant commande, l’utilisateur accepte les présentes conditions. Elles s’appliquent aux catalogues, aux commandes et au parcours de vérification de paiement disponibles sur BMF Top Up.</p>
        <p>Les pages du site peuvent être consultées sans compte. La création d’une commande et l’envoi d’un justificatif nécessitent un compte utilisateur.</p>
      </TermsSection>

      <TermsSection title="2. Compte utilisateur">
        <p>L’utilisateur fournit des informations exactes et protège ses identifiants. Il est responsable des actions réalisées depuis son compte et doit signaler rapidement tout accès qu’il ne reconnaît pas.</p>
        <p>Un compte client ne donne pas accès aux fonctions d’administration. Toute tentative d’accès non autorisé aux commandes, aux preuves de paiement ou aux outils internes est interdite.</p>
      </TermsSection>

      <TermsSection title="3. Catalogue et commande">
        <p>Les produits et prix affichés dans le catalogue connecté sont ceux proposés au moment de la commande. Une commande est enregistrée avec une référence BMF unique et un récapitulatif du produit, du montant et du moyen de paiement sélectionnés.</p>
        <p>Pour une recharge, l’utilisateur doit vérifier son Player ID avant validation. BMF ne peut garantir l’exécution d’une commande dont les informations de destination ont été saisies de manière incorrecte.</p>
        <p>La création d’une commande ne constitue ni une preuve de paiement ni une confirmation de livraison.</p>
      </TermsSection>

      <TermsSection title="4. Paiement et vérification">
        <p>Le paiement est effectué par transfert manuel via MonCash ou NatCash, vers les coordonnées ou le QR marchand affiché pour la commande. L’utilisateur doit respecter le montant indiqué et conserver le reçu ainsi que l’ID de transaction.</p>
        <p>Après le transfert, l’utilisateur transmet l’ID de transaction, son téléphone d’expéditeur et une preuve JPG, PNG, WebP ou PDF de 5 Mo maximum. Les justificatifs sont stockés dans un espace privé et accessibles aux personnes autorisées au traitement des commandes.</p>
        <p>La vérification est manuelle dans le portefeuille marchand. La soumission d’un justificatif fait passer la commande en attente; seule la vérification administrative peut la confirmer comme payée ou la refuser. Aucune vérification automatique par API MonCash ou NatCash n’est annoncée.</p>
      </TermsSection>

      <TermsSection title="5. Traitement et réclamation">
        <p>Le traitement intervient après confirmation effective du paiement. Aucun délai instantané n’est garanti par les présentes conditions. La disponibilité du produit et les vérifications nécessaires peuvent influer sur le délai.</p>
        <p>Pour une réclamation, l’utilisateur doit conserver et communiquer la référence BMF, le reçu et l’ID de transaction au support officiel de BMF. Il ne doit pas effectuer un second transfert pour la même commande avant clarification.</p>
        <p>Les demandes d’annulation, de correction ou de remboursement sont examinées au regard de l’état de la commande et des règles impératives applicables. Ces conditions ne suppriment pas les droits dont l’utilisateur bénéficie en vertu de la loi applicable.</p>
      </TermsSection>

      <TermsSection title="6. Usage interdit">
        <p>L’utilisateur s’engage à ne pas transmettre de faux justificatif, utiliser l’ID de transaction d’un tiers sans autorisation, perturber le service ou tenter de contourner les contrôles d’accès. BMF peut suspendre le traitement d’une commande présentant des éléments incohérents ou suspects le temps de procéder aux vérifications nécessaires.</p>
      </TermsSection>

      <TermsSection title="7. Données et sécurité">
        <p>Les données de compte, de commande et les justificatifs sont utilisés pour gérer les comptes, rapprocher les paiements et traiter les commandes. Les justificatifs ne sont pas publiquement accessibles. L’accès aux informations de commande est limité selon le rôle du compte.</p>
        <p>L’utilisateur ne doit jamais transmettre ses mots de passe, codes PIN ou codes de validation MonCash/NatCash dans un formulaire ou à un tiers.</p>
      </TermsSection>

      <TermsSection title="8. Évolution et disponibilité du service">
        <p>Les fonctionnalités, catalogues et moyens de paiement peuvent évoluer. Des opérations de maintenance, incidents techniques ou indisponibilités des fournisseurs de paiement peuvent temporairement empêcher la consultation ou le traitement d’une commande.</p>
      </TermsSection>
    </LegalShell>
  );
}