import { carSvg } from '../lib/placeholder.js';
import { S, M } from '../lib/calc.js';

import { CHARTE_TPL, CONVENTION_TPL } from './templates.js';

const kycFiles = (n) => ({ rib: `RIB_${n}.pdf`, id: `CNI_${n}.pdf`, domicile: `Justificatif_domicile_${n}.pdf` });
const signed = (d) => ({ date: d, otp: true });

const mk = (id, num, prenom, nom, parrain, extra = {}) => ({
  id,
  num,
  prenom,
  nom,
  parrain,
  status: M.ACTIF,
  dob: '',
  lieu: '',
  email: `${prenom}.${nom}@mail.fr`.toLowerCase(),
  kyc: kycFiles(nom),
  charte: signed('2026-02-10'),
  createdAt: '2026-01-20',
  ...extra,
});

const pl = (uid, amount, contractSigned = true, payment = 'RECU') => ({
  uid,
  amount,
  contractSigned,
  signedAt: contractSigned ? '2026-09-01' : null,
  payment,
});

const photos = (c) => [carSvg(c, 0), carSvg(c, 1), carSvg(c, 2)];

export function seedState() {
  return {
    view: 'client',
    route: { name: 'showroom' },
    activeUserId: 'm12',
    candidateId: 'm50',
    toast: null,
    rib: {
      titulaire: 'GT AUTO PRIVÉ SAS',
      banque: 'Banque Privée Européenne',
      iban: 'FR76 3000 4012 3400 0100 2345 678',
      bic: 'BPEUFRPPXXX',
    },
    templates: { charte: CHARTE_TPL, convention: CONVENTION_TPL },
    members: [
      mk('m12', 12, 'Julien', 'Moreau', 'Paul Garnier', { dob: '1985-04-12', lieu: 'Lyon' }),
      mk('m3', 3, 'Claire', 'Fontaine', 'Fondateur', { dob: '1979-11-02', lieu: 'Paris' }),
      mk('m7', 7, 'Thomas', 'Girard', 'Claire Fontaine', { dob: '1982-06-21', lieu: 'Nantes' }),
      mk('m15', 15, 'Sophie', 'Lambert', 'Thomas Girard', { dob: '1990-01-30', lieu: 'Bordeaux' }),
      mk('m21', 21, 'Marc', 'Dubois', 'Julien Moreau', { dob: '1976-09-15', lieu: 'Lille' }),
      mk('m28', 28, 'Nadia', 'Benali', 'Sophie Lambert', { dob: '1988-03-08', lieu: 'Marseille' }),
      mk('m34', 34, 'Pierre', 'Vasseur', 'Marc Dubois', { dob: '1971-12-25', lieu: 'Toulouse' }),
      mk('m41', 41, 'Elisa', 'Roche', 'Nadia Benali', { dob: '1993-07-17', lieu: 'Rennes' }),
      // Étape 1 : demandes en attente
      { id: 'm60', prenom: 'Léa', nom: 'Bernard', parrain: 'Thomas Girard', status: M.ATT, createdAt: '2026-10-20' },
      { id: 'm61', prenom: 'Hugo', nom: 'Petit', parrain: 'Claire Fontaine', status: M.ATT, createdAt: '2026-10-21' },
      { id: 'm62', prenom: 'Sarah', nom: 'Lemoine', parrain: 'Julien Moreau', status: M.ATT, createdAt: '2026-10-22' },
      // Étape 2 : en cours
      { id: 'm50', prenom: 'Camille', nom: 'Dubois', parrain: 'Sophie Lambert', status: M.E2, createdAt: '2026-10-15' },
      {
        id: 'm51',
        prenom: 'Antoine',
        nom: 'Roux',
        parrain: 'Pierre Vasseur',
        status: M.KYC,
        dob: '1984-05-09',
        lieu: 'Grenoble',
        email: 'antoine.roux@mail.fr',
        kyc: kycFiles('Roux'),
        charte: null,
        createdAt: '2026-10-12',
      },
    ],
    vehicles: [
      {
        id: 'V001', marque: 'Mini', modele: 'Cooper', finition: 'John Cooper Works', motorisation: '2.0 231 ch essence', annee: 2015, km: 78400,
        photos: photos('#c0392b'), prixAchat: 10000, margeVisee: 2400, pctRoyalties: 40, status: S.F100,
        infos: "Carnet d'entretien complet, distribution récente, pneus neufs. Revente ciblée sur le marché des compactes sportives, objectif de vente sous 45 jours.",
        pledges: [pl('m12', 5000, false, 'EN_ATTENTE'), pl('m7', 3000, true, 'DECLARE'), pl('m21', 2000, true, 'RECU')],
      },
      {
        id: 'V002', marque: 'Audi', modele: 'S3 (8V)', finition: 'Sportback Quattro', motorisation: '2.0 TFSI 300 ch', annee: 2016, km: 91200,
        photos: photos('#2f6fdb'), prixAchat: 15000, margeVisee: 3200, pctRoyalties: 40, status: S.FIN,
        infos: 'Véhicule 2e main, origine France. Léger travail de carrosserie prévu (pare-chocs avant) et rénovation des jantes. Forte demande sur ce modèle.',
        pledges: [pl('m3', 7000, false, 'EN_ATTENTE'), pl('m28', 5000, false, 'EN_ATTENTE')],
      },
      {
        id: 'V003', marque: 'BMW', modele: 'M2', finition: 'Competition', motorisation: '3.0 410 ch essence', annee: 2019, km: 42300,
        photos: photos('#e67e22'), prixAchat: 38000, margeVisee: 5200, pctRoyalties: 40, status: S.COM, valeurVente: 46900, dateCom: '2026-09-28',
        infos: "Première main, historique BMW complet, garantie constructeur restante 8 mois. Préparation esthétique réalisée, annonces publiées sur 3 plateformes.",
        pledges: [pl('m12', 10000), pl('m34', 15000), pl('m15', 13000)],
      },
      {
        id: 'V004', marque: 'Mercedes-AMG', modele: 'A45', finition: 'Edition 1', motorisation: '2.0 381 ch essence', annee: 2016, km: 67900,
        photos: photos('#7f8c8d'), prixAchat: 24000, margeVisee: 3200, pctRoyalties: 40, status: S.COM, valeurVente: 29500, dateCom: '2026-10-05',
        infos: 'Pack Aérodynamique Edition 1, échappement sport, entretien en réseau. Deux contacts sérieux en cours.',
        pledges: [pl('m3', 12000), pl('m28', 12000)],
      },
      {
        id: 'V005', marque: 'Alpine', modele: 'A110', finition: 'Pure', motorisation: '1.8 252 ch essence', annee: 2019, km: 28700,
        photos: photos('#2e86de'), prixAchat: 42000, margeVisee: 5000, pctRoyalties: 45, status: S.VENDU, valeurVente: 49500,
        prixVenteReel: 49800, margeFinale: 5600, joursRotation: 47,
        infos: 'Vendue à un particulier en 47 jours. Aucune remise accordée sur le prix affiché.',
        docs: { factures: { name: 'Factures_depenses_V005.zip' }, vente: { name: 'Facture_vente_V005.pdf' } },
        pledges: [pl('m12', 6000), pl('m7', 16000), pl('m15', 20000)],
      },
      {
        id: 'V006', marque: 'Volkswagen', modele: 'Golf R', finition: 'DSG 4Motion', motorisation: '2.0 TSI 310 ch', annee: 2018, km: 55100,
        photos: photos('#34495e'), prixAchat: 22000, margeVisee: 3000, pctRoyalties: 40, status: S.VENDU, valeurVente: 26400,
        prixVenteReel: 26400, margeFinale: 3100, joursRotation: 38,
        infos: 'Vendue à un professionnel (reprise). Frais de remise en état inférieurs à la prévision.',
        docs: { factures: { name: 'Factures_depenses_V006.zip' }, vente: { name: 'Facture_vente_V006.pdf' } },
        pledges: [pl('m12', 4000), pl('m3', 8000), pl('m21', 10000)],
      },
    ],
  };
}
