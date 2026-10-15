# Supplied top 50 catalogue

The user supplied `Meltzer_Top_50_Match_Covers.zip` and explicitly requested its 50 matches and corresponding images in the supplied ranking order. This replaces the earlier twelve-example catalogue; it does not introduce a scraper, import pipeline or database.

Records are copied from the archive's `sources.csv`, not inferred from similar opponent names or researched independently. The supplied ordering is rating descending, date ascending, then match title for same-day ties. It includes 50 entries from 1989 to 2026 and cuts off among matches tied at 5.5 stars. It is not claimed to be a complete archive or an official ranked list published by Dave Meltzer.

**Status: user-supplied, reference-linked; independent verification pending.** The archive cites Wikipedia's list of matches rated five or more stars. Dates are held/taped dates according to the supplied notes, which may differ from broadcast dates. Unavailable venue, championship and stipulation metadata is left empty; existing metadata for matching prior records is retained with its prior unverified status.

## Image matching and provenance

- [Original CSV](top50/sources.csv) contains rank, rating, date, participants, promotion, event, original image filename, image type, source page and original image URL.
- [Original collection notes](top50/collection-notes.txt) explain the supplied selection and image limitations.
- `src/data/cover-provenance.json` maps every CSV row to its application match ID, bundled image path and SHA-256 digest. Image bytes are copied unchanged.
- `public/art/top50/01.jpg` through `50.jpg` correspond exactly to the CSV ranks. Repeated opponents are distinguished by date and event, not their image filenames alone.

The artwork mixes match photographs, promotional graphics and event posters. A poster is not presented as a photograph of the bout. The supplied Flair/Steamboat image depicts the rivalry; the collection does not verify that it shows the specific Landover match. Source URLs establish provenance, not a reuse licence or independent verification.

Seven matches from the earlier catalogue retain stable IDs, and previous folder-name aliases are retained for local video lookup. The remaining former five-star examples are outside this supplied selection.
