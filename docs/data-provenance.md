# Supplied CAGEMATCH top 100

The user supplied `Wrestling_Vault_Cagematch_Top_100_with_Star_Ratings.zip` and requested replacing the prior library with its 100 matches and corresponding images. The supplied snapshot is dated 16 October 2026 and describes CAGEMATCH's default top 100 list with at least 100 votes. Order follows `INDEX.csv` exactly; it is not re-sorted by WON star ratings.

**Status: user-supplied and reference-linked; independent verification pending.** No online scraping or source verification was performed for this update.

## Separate rating scales

- `cagematchScore` is the supplied community score out of ten and determines the supplied ranking.
- `rating` is the supplied WON star rating from each image filename, checked against `INDEX.csv`'s `WON star rating` column.
- Eight `no_rating` entries use JSON null and display Unrated. Null does not mean zero stars. The star-rating dropdown includes these entries explicitly.

## Exact image mapping

The original [index](cagematch-top100/INDEX.csv) and [collection notes](cagematch-top100/collection-notes.txt) are preserved. `src/data/cover-provenance.json` retains every source row, original filename, application match ID, bundled image path and SHA-256 digest. `public/art/cagematch100/001` through `100` use the original JPG, PNG or WebP image bytes. Participant names, dates and events come from the supplied index/filenames, not guesses from the artwork.

Company prefixes are separated from event titles; co-promoted events retain each named company. Team participants are preserved individually. Images include posters, tournament art, match graphics, photographs, video stills and podcast artwork. Original notes distinguish tournament-wide imagery and other alternatives from exact-bout photography. Source links do not establish a reuse licence or independent accuracy.

Twenty-seven matches shared with the previous catalogue retain IDs and prior video folder/name aliases. New IDs use supplied CAGEMATCH match-record numbers. The active library and cover assets replace the old top 50. Existing search, local playback, download highlighting and animation behavior remain; the only new control is the requested star-rating dropdown.
