/** Canonical labels already used by the vault. Unknown names are preserved, never guessed. */
const names: Record<string, string[]> = {
  NJPW: ['New Japan Pro Wrestling', 'New Japan Pro-Wrestling'],
  AJPW: ['All Japan Pro Wrestling'],
  NOAH: ['Pro Wrestling NOAH'],
  WWE: ['World Wrestling Entertainment'],
  WWF: ['World Wrestling Federation'],
  AEW: ['All Elite Wrestling'],
  ROH: ['Ring Of Honor', 'Ring Of Honor Wrestling'],
  TNA: ['Total Nonstop Action Wrestling', 'Total Nonstop Action', 'Impact Wrestling'],
  CMLL: ['Consejo Mundial de Lucha Libre'],
  AAA: [
    'Lucha Libre AAA Worldwide',
    'Lucha Libre AAA World Wide',
    'Asistencia Asesoria y Administracion',
  ],
  DDT: ['DDT Pro Wrestling', 'Dramatic Dream Team', 'Dramatic Dream Team Pro Wrestling'],
  GAEA: ['GAEA Japan'],
  JWP: ['JWP Joshi Puroresu', 'Japan Womens Pro Wrestling Project'],
  AJW: ["All Japan Women's Pro Wrestling", 'All Japan Women'],
  NWA: ['National Wrestling Alliance'],
  Stardom: ['World Wonder Ring Stardom'],
  'Lucha Underground': [],
  'Kensuke Office': [],
};
const key = (value: string) =>
  value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
const aliases = new Map<string, string>();
for (const [label, variants] of Object.entries(names)) {
  for (const variant of [label, ...variants]) {
    aliases.set(key(variant), label);
    aliases.set(key(`${variant} (${label})`), label);
  }
}
export function normalizePromotion(value: string): string {
  const name = value.trim().replace(/\s+/g, ' ');
  const exact = aliases.get(key(name));
  if (exact) return exact;
  const parts = name.split(/\s*(?:\/|\s&\s|\s\+\s)\s*/);
  if (parts.length > 1 && parts.every((part) => part.trim())) {
    return [...new Set(parts.map((part) => aliases.get(key(part)) ?? part.trim()))].join('/');
  }
  return name;
}
