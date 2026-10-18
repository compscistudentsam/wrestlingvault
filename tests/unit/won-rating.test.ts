import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseWonRating } from '../../src/shared/won-rating';
import { parseCagematch } from '../../electron/cagematch';
import { parseMatchPageText } from '../../src/shared/cagematch-text';

it.each([
  ['****3/4', 4.75],
  ['**** 3/4', 4.75],
  ['****¾', 4.75],
  ['****1/2', 4.5],
  ['****¼', 4.25],
  ['*****', 5],
  ['******1/4', 6.25],
  ['4.75', 4.75],
  ['0', 0],
  ['1/2', 0.5],
  ['', undefined],
  ['N/A', undefined],
  ['****2/3', undefined],
  ['11', undefined],
  ['4.7', undefined],
  ['9.43 [342]', undefined],
  ['**** some comment', undefined],
])('parses the labelled WON value %s as %s', (value, expected) => {
  expect(parseWonRating(value)).toBe(expected);
});
it('imports the 6851 WON star fraction separately from its community score and comments', () => {
  const html = readFileSync('tests/fixtures/cagematch/6851.html', 'utf8');
  const result = parseCagematch(html, 'https://www.cagematch.net/?id=111&nr=6851');
  expect(result.rating).toBe(4.75);
  expect(result.cagematchScore).toBe(9.43);
  expect(result.wrestlers).toEqual(['AJ Styles', 'Hiroshi Tanahashi']);
  expect(
    parseCagematch(html.replace('WON rating:', 'Unrelated:'), result.sourceUrl!).rating,
  ).toBeUndefined();
  expect(
    parseMatchPageText(
      'Fixture: AJ Styles vs. Hiroshi Tanahashi\nWON rating: ****3/4\nAverage rating: 9.43 [342]',
      result.sourceUrl!,
    ).rating,
  ).toBe(4.75);
});
