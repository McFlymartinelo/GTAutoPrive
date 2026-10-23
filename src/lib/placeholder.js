// Visuels de démonstration générés en SVG (aucune dépendance réseau). Remplaçables par de vraies URLs photo.
const wrap = (c, inner) =>
  'data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 500'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='${c}' stop-opacity='.45'/><stop offset='1' stop-color='#0b0d10'/></linearGradient><linearGradient id='b' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='${c}'/><stop offset='1' stop-color='#000' stop-opacity='.55'/></linearGradient></defs><rect width='800' height='500' fill='url(#g)'/><ellipse cx='400' cy='392' rx='320' ry='22' fill='#000' opacity='.45'/>${inner}</svg>`,
  );

const wheel = (x, y, r) =>
  `<circle cx='${x}' cy='${y}' r='${r}' fill='#0a0a0a'/><circle cx='${x}' cy='${y}' r='${r * 0.62}' fill='#9aa0aa'/><circle cx='${x}' cy='${y}' r='${r * 0.22}' fill='#222'/>`;

export function carSvg(color, i = 0) {
  if (i === 1)
    return wrap(
      color,
      `<path d='M180 350 L200 270 Q215 215 300 200 L500 200 Q585 215 600 270 L620 350 Z' fill='url(#b)'/><path d='M250 215 L550 215 L575 262 L225 262 Z' fill='#0b0d10' opacity='.8'/><rect x='215' y='285' width='80' height='28' rx='12' fill='#f3e9c6'/><rect x='505' y='285' width='80' height='28' rx='12' fill='#f3e9c6'/><rect x='330' y='296' width='140' height='34' rx='8' fill='#111'/><rect x='170' y='340' width='90' height='50' rx='10' fill='#0a0a0a'/><rect x='540' y='340' width='90' height='50' rx='10' fill='#0a0a0a'/>`,
    );
  if (i === 2)
    return wrap(
      color,
      `${wheel(400, 240, 170)}<g stroke='#2a2d33' stroke-width='14'>${[0, 36, 72, 108, 144]
        .map((a) => `<line x1='400' y1='240' x2='${400 + 105 * Math.cos((a * Math.PI) / 180)}' y2='${240 + 105 * Math.sin((a * Math.PI) / 180)}'/><line x1='400' y1='240' x2='${400 - 105 * Math.cos((a * Math.PI) / 180)}' y2='${240 - 105 * Math.sin((a * Math.PI) / 180)}'/>`)
        .join('')}</g><circle cx='400' cy='240' r='26' fill='${color}'/>`,
    );
  return wrap(
    color,
    `<path d='M110 330 L130 272 Q150 242 220 234 L300 182 Q340 162 420 162 L520 167 Q580 187 620 237 Q690 247 700 292 L705 332 Z' fill='url(#b)'/><path d='M312 192 L420 174 L420 234 L272 238 Z' fill='#0b0d10' opacity='.75'/><path d='M440 174 L510 178 Q550 197 575 234 L440 234 Z' fill='#0b0d10' opacity='.75'/>${wheel(222, 336, 52)}${wheel(592, 336, 52)}`,
  );
}

export const FALLBACK = carSvg('#6b7280', 0);
