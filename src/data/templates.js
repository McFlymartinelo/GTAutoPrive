export const CHARTE_TPL = `CHARTE D'ADHÉSION & LETTRE D'INFORMATION SUR LES RISQUES
Club privé GT Auto Privé

Entre :
GT Auto Privé, ci-après « le Club », représenté par son opérateur,
Et :
{{prenom}} {{nom}}, né(e) le {{date_naissance}} à {{lieu_naissance}}, ci-après « le Membre ».

Article 1 — Objet
Le Club est un cercle privé, limité à 149 membres, au sein duquel l'opérateur acquiert des véhicules d'occasion en vue de leur revente. Le Membre peut, véhicule par véhicule, financer tout ou partie du prix d'achat et percevoir en contrepartie des royalties assises sur la marge nette HT réalisée.

Article 2 — Parrainage et admission
L'admission est subordonnée au parrainage par un membre existant et à la validation de l'opérateur, après vérification des pièces d'identité (KYC).

Article 3 — Fonctionnement
Chaque opération fait l'objet d'une promesse d'investissement non contraignante, puis, une fois le financement atteint à 100 %, d'une Convention de Revenus Futurs spécifique au véhicule, à signer électroniquement avant tout virement.

Article 4 — Information sur les risques
Le Membre reconnaît avoir été informé que : (i) toute opération comporte un risque de perte partielle ou totale du capital ; (ii) les marges visées sont des objectifs et non des garanties ; (iii) la durée de rotation d'un véhicule n'est pas garantie ; (iv) les royalties sont soumises au prélèvement forfaitaire unique (flat tax) de 30 % ; (v) les sommes engagées sont peu liquides jusqu'à la revente du véhicule.

Article 5 — Données personnelles
Les données du Membre sont traitées conformément au RGPD aux seules fins de gestion du Club et des obligations de lutte contre le blanchiment (LCB-FT).

Article 6 — Signature électronique
Le Membre reconnaît que la signature électronique apposée ci-dessous a la même valeur qu'une signature manuscrite.

Fait le {{date_du_jour}}.`;

export const CONVENTION_TPL = `CONVENTION DE REVENUS FUTURS (ROYALTIES)
Véhicule : {{marque}} {{modele}} {{finition}}

Entre GT Auto Privé (« l'Opérateur ») et {{prenom_investisseur}} {{nom_investisseur}}, né(e) le {{date_naissance}} à {{lieu_naissance}} (« l'Investisseur »).

Article 1 — Véhicule
{{marque}} {{modele}} {{finition}} — motorisation {{motorisation}} — année {{annee}} — {{kilometrage}}.
Prix d'achat convenu : {{prix_achat}}.

Article 2 — Participation
L'Investisseur finance {{montant_investi}}, soit une quote-part de {{quote_part_pourcentage}} du prix d'achat.

Article 3 — Royalties
Marge nette HT visée : {{marge_visee_ht}}. {{pourcentage_royalties}} de la marge nette HT réalisée est affecté au pool de royalties, réparti entre les co-investisseurs au prorata de leur quote-part.

Article 4 — Fiscalité
Les royalties brutes sont soumises à la flat tax de 30 %, retenue avant versement. Le net est viré sur le RIB communiqué par l'Investisseur.

Article 5 — Restitution
À la vente du véhicule, l'Opérateur restitue le capital engagé et verse les royalties nettes sous réserve de la marge effectivement réalisée. La marge finale peut différer de la marge visée ; le capital n'est pas garanti.

Article 6 — Paiement
Le virement est à effectuer manuellement sur le compte professionnel de l'Opérateur avec la référence indiquée dans l'application, après signature de la présente convention.

Fait le {{date_du_jour}}.`;
