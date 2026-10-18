/** Parse only the explicitly labelled WON field, never ratings in user comments. */
export function parseWonRating(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const normalized = value
    .trim()
    .replace(/[¼½¾]/g, (fraction) => ({ '¼': '1/4', '½': '1/2', '¾': '3/4' })[fraction]!)
    .replace(/\s+/g, '');
  let rating: number;
  if (/^\d+(?:\.\d+)?$/.test(normalized)) rating = Number(normalized);
  else {
    const stars = normalized.match(/^(\*+|★+)?(1\/4|1\/2|3\/4)?$/);
    if (!stars || (!stars[1] && !stars[2])) return undefined;
    rating = (stars[1]?.length ?? 0) + (stars[2] ? Number(stars[2][0]) / Number(stars[2][2]) : 0);
  }
  return rating >= 0 && rating <= 10 && Number.isInteger(rating * 4) ? rating : undefined;
}
