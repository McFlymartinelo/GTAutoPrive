// Crée (ou réinitialise le mot de passe d') un compte administrateur.
// Usage : npm run create-admin            (invite interactive)
//         npm run create-admin -- email@domaine.fr   (mot de passe demandé)
import readline from 'node:readline/promises';
import crypto from 'node:crypto';
import { db, audit } from './db.js';
import { hashPassword, validatePassword, validEmail } from './auth.js';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const email = (process.argv[2] || (await rl.question('E-mail administrateur : '))).toLowerCase().trim();
if (!validEmail(email)) {
  console.error('Adresse e-mail invalide.');
  process.exit(1);
}
const pw = process.env.ADMIN_PASSWORD || (await rl.question('Mot de passe (10 caractères min) : '));
rl.close();
validatePassword(pw);

const existing = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
if (existing && existing.role !== 'admin') {
  console.error('Cette adresse est déjà utilisée par un compte investisseur.');
  process.exit(1);
}
if (existing) {
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(pw), existing.id);
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(existing.id);
  audit(existing.id, 'admin_password_reset');
  console.log(`Mot de passe réinitialisé pour ${email}.`);
} else {
  const id = crypto.randomUUID();
  db.prepare('INSERT INTO users (id, email, password_hash, role, created_at) VALUES (?,?,?,?,?)').run(id, email, hashPassword(pw), 'admin', new Date().toISOString());
  audit(id, 'admin_created');
  console.log(`Administrateur créé : ${email}`);
}
