import { expect, it } from 'vitest';
import { normalizePromotion } from '../../src/shared/promotions';
import { libraryMatches } from '../../src/shared/library-matches';
import { matches } from '../../src/data/catalogue';
import { parseCagematch } from '../../electron/cagematch';
import { validateDraft } from '../../src/shared/imports';

it.each([
  ['New Japan Pro-Wrestling', 'NJPW'],
  ['New Japan Pro Wrestling (NJPW)', 'NJPW'],
  ['All Elite Wrestling', 'AEW'],
  ['World Wrestling Entertainment', 'WWE'],
  ['World Wrestling Federation', 'WWF'],
  ['Pro Wrestling NOAH', 'NOAH'],
  ['All Japan Pro Wrestling', 'AJPW'],
  ['Ring Of Honor', 'ROH'],
  ['Total Nonstop Action Wrestling', 'TNA'],
  ['World Wonder Ring STARDOM', 'Stardom'],
  ['DDT Pro Wrestling', 'DDT'],
  ["All Japan Women's Pro-Wrestling", 'AJW'],
  ['Consejo Mundial de Lucha Libre', 'CMLL'],
  ['National Wrestling Alliance', 'NWA'],
  ['Lucha Underground', 'Lucha Underground'],
  ['new company', 'new company'],
  ['New Japan Pro Wrestling / All Elite Wrestling', 'NJPW/AEW'],
  ['AEW & New Japan Pro-Wrestling', 'AEW/NJPW'],
  ['NJPW / New Japan Pro Wrestling', 'NJPW'],
])('normalizes %s to the existing label %s', (value, expected) => {
  expect(normalizePromotion(value)).toBe(expected);
});
it('normalizes lookup, manual saves and existing library display consistently', () => {
  const source = matches[0];
  expect(validateDraft({ ...source, promotion: 'New Japan Pro Wrestling' }).promotion).toBe('NJPW');
  expect(
    parseCagematch(
      '<div class="InformationBoxRow"><div class="InformationBoxTitle">Promotion:</div><div class="InformationBoxContents">All Elite Wrestling</div></div>',
      source.sourceUrl,
    ).promotion,
  ).toBe('AEW');
  const records = libraryMatches([
    {
      ...source,
      id: 'custom-example',
      sourceUrl: 'https://www.cagematch.net/?id=111&nr=99999999',
      promotion: 'New Japan Pro Wrestling',
    },
  ]);
  expect(records.at(-1)?.promotion).toBe('NJPW');
  expect(new Set(records.map((record) => record.promotion)).has('New Japan Pro Wrestling')).toBe(
    false,
  );
});
