// Générateur PDF minimal (texte seul) pour les documents de démonstration : RIB, charte, conventions, factures.
const clean = (s) =>
  String(s)
    .replace(/[  ]/g, ' ')
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/…/g, '...')
    .replace(/€/g, '\u0080')
    .replace(/[^\x00-\xff]/g, '?')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');

function wrap(text, width = 90) {
  const out = [];
  for (const raw of String(text).split('\n')) {
    let line = '';
    for (const w of raw.split(' ')) {
      if ((line + ' ' + w).trim().length > width) {
        out.push(line);
        line = w;
      } else line = (line + ' ' + w).trim();
    }
    out.push(line);
  }
  return out;
}

export function buildPdf(title, text) {
  const lines = wrap(text);
  const pages = [];
  for (let i = 0; i < lines.length; i += 50) pages.push(lines.slice(i, i + 50));
  if (!pages.length) pages.push(['']);

  const objs = [];
  objs[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objs[2] = `<< /Type /Pages /Kids [${pages.map((_, i) => `${4 + i * 2} 0 R`).join(' ')}] /Count ${pages.length} >>`;
  objs[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
  pages.forEach((pl, i) => {
    let c = 'BT\n';
    c += i === 0 ? `/F1 16 Tf 50 800 Td (${clean(title)}) Tj\n/F1 10 Tf 0 -28 Td 14 TL\n` : '/F1 10 Tf 50 800 Td 14 TL\n';
    pl.forEach((l) => (c += `(${clean(l)}) Tj T*\n`));
    c += 'ET';
    objs[4 + i * 2] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${5 + i * 2} 0 R >>`;
    objs[5 + i * 2] = `<< /Length ${c.length} >>\nstream\n${c}\nendstream`;
  });

  let out = '%PDF-1.4\n';
  const offsets = [];
  for (let i = 1; i < objs.length; i++) {
    offsets[i] = out.length;
    out += `${i} 0 obj\n${objs[i]}\nendobj\n`;
  }
  const xref = out.length;
  out += `xref\n0 ${objs.length}\n0000000000 65535 f \n`;
  for (let i = 1; i < objs.length; i++) out += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  out += `trailer\n<< /Size ${objs.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new Blob([Uint8Array.from(out, (ch) => ch.charCodeAt(0) & 0xff)], { type: 'application/pdf' });
}

export function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export const downloadPdf = (title, text, name) => downloadBlob(buildPdf(title, text), name);
