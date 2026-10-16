# Tile artwork and match lengths

Portrait posters whose aspect ratio can fill at least 80% of the cover face use the full face beside the existing 5% spine. CSS `object-fit: contain` preserves the whole source image. Landscape, square and unusually narrow artwork retains the inset treatment. Source images remain unchanged.

The tile's upper-right label shows match length; WON stars remain at the bottom. The supplied top-100 index has no duration column. Currently 33 durations have been checked against linked results; 67 display “Length unknown”. Each populated `matchDuration` has a `durationSource` in `src/data/matches.json`. These are match lengths, not local video runtimes. Existing star ratings are unchanged.

Most timings come from Quebrada's recommended-match listing, matched by date and participants. Its separate star ratings are not imported. For DDT 2012-08-18 the full 37:26 is used rather than the listed 35:09 of footage. The 1992-11-26 AJW tag match totals its three falls (14:38 + 1:44 + 24:00 = 40:22). NJPW's 2018 G1 final and Dominion 2017 use Pro Wrestling History's event results.
