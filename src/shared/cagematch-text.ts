import { normalizePromotion } from './promotions';
import { parseWonRating } from './won-rating';
import { cagematchURL, type MatchDraft } from './imports';

/** Parse text the user copied from a match page in their own browser. No page code runs. */
export function parseMatchPageText(text: string, source: string): Partial<MatchDraft> {
  if (!text.trim() || text.length > 200_000)
    throw new Error('Paste the visible match-page text (up to 200,000 characters).');
  if (/javascript is required|enable javascript before you are allowed/i.test(text))
    throw new Error(
      'This is still the access-check page. Wait until the match details appear in your browser, then copy them.',
    );
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  const value = (...labels: string[]) => {
    for (let i = 0; i < lines.length; i++) {
      for (const label of labels) {
        const match = lines[i].match(new RegExp(`^${label}\\s*:\\s*(.*)$`, 'i'));
        if (match) return match[1] || lines[i + 1] || '';
      }
    }
    return '';
  };
  const result: Partial<MatchDraft> = { sourceUrl: cagematchURL(source) };
  const title =
    value('Fixture', 'Match') ||
    lines.find((line) => /\s+vs\.?\s+/i.test(line) && line.length < 310) ||
    '';
  const names = title.split(/\s+vs\.?\s+/i).map((name) => name.replace(/\s*\(c\)/gi, '').trim());
  if (
    names.length >= 2 &&
    names.length <= 8 &&
    names.every((name) => name.length > 0 && name.length <= 150)
  )
    result.wrestlers = names;
  const date = value('Date', 'Match date').match(/\b(\d{2})\.(\d{2})\.(\d{4})\b/);
  if (date) result.date = `${date[3]}-${date[2]}-${date[1]}`;
  const iso = value('Date', 'Match date').match(/^\d{4}-\d{2}-\d{2}$/);
  if (!date && iso) result.date = iso[0];
  const event = value('Event');
  if (event && event.length <= 200) result.event = event;
  const promotion = value('Promotion', 'Company');
  if (promotion && promotion.length <= 100) result.promotion = normalizePromotion(promotion);
  const duration = value('Time', 'Match length', 'Duration').match(/^\d{1,3}:[0-5]\d$/);
  if (duration) result.matchDuration = duration[0];
  const score =
    value('Average rating', 'Rating').match(/^([0-9]+(?:\.[0-9]+)?)(?:\s|\[|$)/)?.[1] ?? '';
  if (/^\d+(?:\.\d+)?$/.test(score) && Number(score) <= 10) result.cagematchScore = Number(score);
  const won = parseWonRating(value('WON rating', 'Wrestling Observer rating'));
  if (won !== undefined) result.rating = won;
  if (!result.wrestlers && !result.event && !result.date)
    throw new Error(
      'No match details were found. Copy the match page after it loads, or enter the details manually.',
    );
  return result;
}
