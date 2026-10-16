// Explicit, distinctive aliases only. Generic words such as "Ace" and "Dragon"
// are too ambiguous to identify a wrestler on their own.
const aliases: readonly [readonly string[], string][] = [
  [['rainmaker'], 'okada'],
  [['the cleaner', 'cleaner', 'best bout machine'], 'omega'],
  [['golden star'], 'ibushi'],
  [['aerial assassin', 'commonwealth kingpin'], 'ospreay'],
  [['american dragon', 'daniel bryan'], 'danielson'],
  [['hangman', 'adam page'], 'page'],
  [['swerve'], 'strickland'],
  [['zsj', 'zack sabre junior'], 'sabre'],
  [['ring general', 'gunther'], 'walter'],
  [['hbk', 'heartbreak kid'], 'michaels'],
  [['stone cold', 'rattlesnake'], 'austin'],
  [['deadman', 'the phenom', 'taker'], 'undertaker'],
  [['hitman'], 'hart'],
  [['nature boy'], 'flair'],
  [['ricky the dragon'], 'steamboat'],
  [['the game', 'triple h', 'hhh'], 'h'],
  [['phenomenal one', 'aj styles', 'a j styles'], 'styles'],
  [['samoan submission machine'], 'joe'],
  [['fallen angel'], 'daniels'],
  [['king of strong style'], 'nakamura'],
  [['stone pitbull'], 'ishii'],
  [['the wrestler'], 'shibata'],
  [['the dragon shingo', 'shingo'], 'takagi'],
  [['ace of the universe'], 'tanahashi'],
  [['tranquilo', 'el ingobernable'], 'naito'],
  [['ftr', 'the revival', 'revival'], 'wheeler harwood wilder dawson'],
  [['young bucks'], 'jackson'],
  [['briscoes', 'briscoe brothers'], 'briscoe'],
  [['lucha brothers', 'lucha bros'], 'miedo fenix'],
  [['penta', 'pentagon jr', 'pentagon junior', 'pentagon dark', 'penta el zero m'], 'miedo'],
  [['ar fox', 'a r fox', 'dante fox'], 'fox'],
  [['swerve strickland', 'shane strickland'], 'killshot'],
  [['diy'], 'gargano ciampa'],
  [['andrade', 'andrade cien almas', 'andrade el idolo'], 'almas'],
  [['iyo sky', 'io sky'], 'shirai'],
  [['kairi sane', 'kairi'], 'hojo'],
  [['utami'], 'hayashishita'],
  [['timeless toni'], 'storm'],
  [['maxwell jacob friedman'], 'mjf'],
];

/** Input and output use the filename index's space-delimited normalization. */
export function expandVideoAliases(label: string) {
  const text = ` ${label} `;
  // Match only against the original label: expansions must not trigger other aliases.
  const extra = aliases
    .filter(([names]) => names.some((name) => text.includes(` ${name} `)))
    .map(([, names]) => names);
  return `${label} ${extra.join(' ')}`.trim();
}

export function expandEventAbbreviations(label: string) {
  return label
    .replace(/\bwk\b/g, 'wrestle kingdom')
    .replace(/\bwm\b/g, 'wrestlemania')
    .replace(/\bbosj\b/g, 'best of the super juniors');
}
