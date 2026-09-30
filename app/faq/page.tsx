import LegalShell from '../legal-shell';

const questions = [
  {
    question: 'Faut-il un compte pour commander ?',
    answer: 'La consultation du catalogue est publique. Pour créer une commande et transmettre un justificatif, vous devez vous connecter ou créer un compte.',
  },
  {
    question: 'Quels moyens de paiement sont proposés ?',
    answer: 'Les commandes utilisent MonCash ou NatCash. Selon la configuration affichée au moment de la commande, le paiement se fait vers un numéro marchand ou via un QR marchand.',
  },
  {
    question: 'À quoi sert la référence de commande ?',
    answer: 'Chaque commande reçoit une référence BMF. Conservez-la et indiquez-la dans le motif du transfert si votre application de paiement le permet. Elle permet de rapprocher le transfert de la commande.',
  },
  {
    question: 'Comment transmettre mon paiement ?',
    answer: 'Après avoir effectué le transfert, renseignez l’ID de transaction, le téléphone de l’expéditeur et joignez un justificatif JPG, PNG, WebP ou PDF de 5 Mo maximum. N’envoyez jamais votre code PIN ni votre mot de passe de portefeuille.',
  },
  {
    question: 'La preuve confirme-t-elle automatiquement le paiement ?',
    answer: 'Non. Les transferts MonCash et NatCash sont vérifiés manuellement dans le portefeuille marchand. Après envoi du justificatif, le statut reste en attente jusqu’à la vérification par l’administration.',
  },
  {
    question: 'Que signifient les statuts de commande ?',
    answer: '« Paiement attendu » signifie qu’aucun justificatif n’a encore été envoyé. « En attente de vérification » signifie que la preuve a été reçue. « Payée » ou « Refusée » correspond à la décision prise après contrôle.',
  },
  {
    question: 'Que faire si le paiement est refusé ou tarde à être vérifié ?',
    answer: 'Vérifiez l’ID de transaction, le montant et la référence, puis conservez le reçu original. Pour toute réclamation, communiquez la référence de commande et l’ID de transaction au support officiel de BMF. Ne renvoyez pas le paiement avant d’avoir clarifié la situation.',
  },
  {
    question: 'Le Player ID est-il vérifié automatiquement ?',
    answer: 'Non. Pour une recharge, vérifiez soigneusement le Player ID avant de créer la commande. Une erreur de saisie peut empêcher l’exécution ou envoyer la recharge au mauvais compte.',
  },
];

export default function FaqPage() {
  return (
    <LegalShell
      title="Questions fréquentes"
      intro="Les réponses essentielles sur les comptes, les commandes et la vérification des paiements BMF."
    >
      <div className="divide-y divide-white/10 border-y border-white/10">
        {questions.map(({ question, answer }) => (
          <details key={question} className="group py-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-semibold text-white marker:hidden">
              {question}
              <span aria-hidden="true" className="text-xl text-cyan-300 transition group-open:rotate-45">+</span>
            </summary>
            <p className="max-w-3xl pt-4 text-sm leading-7 text-slate-300">{answer}</p>
          </details>
        ))}
      </div>
      <p className="text-sm leading-6 text-slate-400">
        La vérification des paiements est manuelle; l’envoi d’un reçu ne vaut pas confirmation du transfert.
      </p>
    </LegalShell>
  );
}