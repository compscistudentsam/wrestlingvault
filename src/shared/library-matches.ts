import { matches as bundled, type Match } from '../data/catalogue';
/** Keep bundled identity, rank and video aliases when a saved entry overrides its metadata. */
export function libraryMatches(records: Match[]): Match[] {
  const overrides = new Map(records.map((record) => [record.sourceUrl, record]));
  const sources = new Set(bundled.map((record) => record.sourceUrl));
  return [
    ...bundled.map((base) => {
      const edited = overrides.get(base.sourceUrl);
      return edited
        ? {
            ...base,
            ...edited,
            id: base.id,
            rank: base.rank,
            videoNameGroups: base.videoNameGroups,
            videoFolderAliases: base.videoFolderAliases,
          }
        : base;
    }),
    ...records.filter((record) => !sources.has(record.sourceUrl)),
  ];
}
