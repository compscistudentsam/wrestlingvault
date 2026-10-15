# Phase 1 data provenance

The JSON catalogue contains 12 deliberately small, manually authored historical sample records. Ratings are attributed to Dave Meltzer; these are not CAGEMATCH community scores. Descriptions are original, concise and avoid disclosing results.

**Status: reference-linked; source verification pending.** The cloud egress proxy returned HTTP 403 when the development task requested the two reference pages. No page content, robots policy or terms could be inspected. No scraping, automated import, bulk extraction, copyright-image download or redistribution agreement is claimed. No source was marked checked merely because its URL exists.

The development brief requests verified samples. The remaining acceptance action is to open permitted references, check the records individually, correct disagreements, record an access date and, when available, the original Wrestling Observer issue. Until then the application explicitly distinguishes samples from verified archive entries. This is a data-review limitation, not a dependency for designing or launching the prototype.

## References supplied for review

1. IWNerd, [Dave Meltzer five-star matches](https://www.iwnerd.com/dave-meltzer-5-star-matches-list/).
2. WrestlePurists, [Dave Meltzer Match Ratings Database](https://wrestlepurists.com/dave-meltzer-match-ratings-database/).

These are secondary reference pages, not licensed bulk-data APIs. They may change or paginate records. A source-page link is not an assertion that all fields are documented on that page.

| Match                 | Date       | Event                        | Listed sample rating | Review reference |
| --------------------- | ---------- | ---------------------------- | -------------------: | ---------------- |
| Steamboat / Flair     | 1989-04-02 | Clash of the Champions VI    |                  5.0 | IWNerd           |
| Bret Hart / Owen Hart | 1994-08-29 | SummerSlam                   |                  5.0 | IWNerd           |
| Michaels / Undertaker | 1997-10-05 | Badd Blood                   |                  5.0 | IWNerd           |
| Punk / Cena           | 2011-07-17 | Money in the Bank            |                  5.0 | IWNerd           |
| Okada / Omega         | 2017-01-04 | Wrestle Kingdom 11           |                  6.0 | IWNerd           |
| Okada / Omega         | 2017-06-11 | Dominion 6.11                |                 6.25 | IWNerd           |
| Omega / Okada         | 2017-08-12 | G1 Climax 27                 |                  6.0 | IWNerd           |
| Omega / Okada         | 2018-06-09 | Dominion 6.9                 |                  7.0 | IWNerd           |
| Ospreay / Takagi      | 2019-06-05 | Best of the Super Juniors 26 |                 5.75 | IWNerd           |
| Gunther / Sheamus     | 2022-09-03 | Clash at the Castle          |                  5.0 | IWNerd           |
| Omega / Ospreay       | 2023-06-25 | Forbidden Door               |                  6.0 | WrestlePurists   |
| Danielson / Ospreay   | 2024-04-21 | Dynasty                      |                  6.5 | WrestlePurists   |

Venue, championship and stipulation fields also require review. Missing duration and watch links are omitted instead of invented. Unspecified championships are omitted; an empty field does not establish an independently verified absence.

## Collection rules

- **Highest rated:** all samples sorted by Meltzer rating descending, then match date descending; ordering reflects only the sample set.
- **Six stars & above:** the same ordering, restricted to ratings at least 6.0.
- **New Japan:** NJPW and co-promoted NJPW records.
- **WWE classics:** WWF and WWE records together; recorded names remain intact.
- **Before 2000:** matches before 2000, in rating/date order; its collection shortcut sets the “Before 2000” era filter.

Empty collections are omitted. No subjective “hidden gems” algorithm or complete historical ranking is represented. Phase 1 uses JSON; database-driven selection begins only in the authorised database phase.
