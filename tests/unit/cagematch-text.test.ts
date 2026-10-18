import { expect, it } from 'vitest';
import { parseMatchPageText } from '../../src/shared/cagematch-text';
import { userError } from '../../src/shared/errors';
const url = 'https://www.cagematch.net/?id=111&nr=6651';
it('reads browser-copied match text with separate numeric scores and star ratings', () => {
  const result = parseMatchPageText(
    'A Wrestler (c) vs. B Wrestler\nMatch\nDate:\n27.04.2025\nEvent: Grand Event\nPromotion:\nNJPW\nTime: 25:10\nAverage rating: 9.75',
    url,
  );
  expect(result).toMatchObject({
    wrestlers: ['A Wrestler', 'B Wrestler'],
    date: '2025-04-27',
    event: 'Grand Event',
    promotion: 'NJPW',
    matchDuration: '25:10',
    cagematchScore: 9.75,
  });
  expect(result.rating).toBeUndefined();
});
it('rejects access-check text, arbitrary pages and excessively large pastes', () => {
  expect(() =>
    parseMatchPageText(
      'Javascript is required. Please enable javascript before you are allowed to see this page.',
      url,
    ),
  ).toThrow('access-check');
  expect(() => parseMatchPageText('Nothing from a match here', url)).toThrow('No match details');
  expect(() => parseMatchPageText('x'.repeat(200001), url)).toThrow('200,000');
});
it('removes Electron invocation details from displayed errors', () => {
  expect(
    userError(
      new Error(
        "Error invoking remote method 'vault:lookup-match': Error: CAGEMATCH needs a browser.",
      ),
    ),
  ).toBe('CAGEMATCH needs a browser.');
  expect(userError(new Error('Enter a valid date.'))).toBe('Enter a valid date.');
});
