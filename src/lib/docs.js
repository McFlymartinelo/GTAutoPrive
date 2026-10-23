import { downloadPdf } from './pdf.js';
import { eur, eur0, dateFr, repartition } from './calc.js';

// Télécharge le fichier réellement uploadé par l'admin, sinon génère un document de démonstration.
function openOrGenerate(doc, title, body, fallbackName) {
  if (doc?.url) {
    const a = document.createElement('a');
    a.href = doc.url;
    a.download = doc.name;
    a.click();
  } else downloadPdf(title, body, (doc?.name || fallbackName).replace(/\.zip$/i, '.pdf'));
}

export function downloadFactures(v) {
  const body = `Dossier des factures de dépenses — ${v.marque} ${v.modele} (${v.id})\n\nDocument de démonstration.\nPrix d'achat : ${eur0(v.prixAchat)}\nMarge nette HT finale : ${eur0(v.margeFinale)}\n\n(Les justificatifs réels sont transmis par l'opérateur à la clôture.)`;
  openOrGenerate(v.docs?.factures, `Factures de dépenses ${v.id}`, body, `Factures_${v.id}.pdf`);
}

export function downloadFactureVente(v) {
  const body = `Facture de vente — ${v.marque} ${v.modele} (${v.id})\n\nPrix de vente réel : ${eur0(v.prixVenteReel)}\nDate d'émission : ${dateFr(new Date())}\n\nDocument de démonstration.`;
  openOrGenerate(v.docs?.vente, `Facture de vente ${v.id}`, body, `Facture_vente_${v.id}.pdf`);
}

export function downloadRib(rib) {
  downloadPdf(
    'Relevé d\'identité bancaire',
    `Titulaire du compte : ${rib.titulaire}\nBanque : ${rib.banque}\nIBAN : ${rib.iban}\nBIC : ${rib.bic}`,
    'RIB_GT_Auto_Prive.pdf',
  );
}

export function repartitionText(v) {
  return repartition(v)
    .map((r) => `${r.uid}: capital ${eur(r.capital)} + royalties nettes ${eur(r.net)} = ${eur(r.total)}`)
    .join('\n');
}
