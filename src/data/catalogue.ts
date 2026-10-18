import records from './matches.json';

export type Match = Omit<(typeof records)[number], 'cagematchScore'> & {
  cagematchScore: number | null;
  artworkHash?: string;
};
export const matches: readonly (typeof records)[number][] = records;
export const getSource = (match: Match) => ({
  name:
    match.sourceStatus === 'user-reviewed'
      ? 'CAGEMATCH · user-reviewed details'
      : 'CAGEMATCH · supplied snapshot',
  url: match.sourceUrl,
});
export const formatRating = (rating: number | null) =>
  rating === null ? 'Unrated' : Number.isInteger(rating) ? rating.toFixed(1) : String(rating);
export const formatDate = (date: string) =>
  new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T12:00:00Z`));
export const yearOf = (match: Match) => Number(match.date.slice(0, 4));

/** Portrait cover art that can occupy at least 80% of the face without cropping. */
export const fillsPosterFace = (match: Match) => {
  const faceRatio = (3 / 4) * 0.95;
  const imageRatio = match.imageWidth / match.imageHeight;
  return imageRatio < 1 && Math.min(imageRatio / faceRatio, faceRatio / imageRatio) >= 0.8;
};
