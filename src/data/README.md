# Data files

All JSON here is parsed with Zod (schemas in `schema/`) by the loaders in `src/lib/data/` and by
`pnpm data:validate`, which runs before every `pnpm build`. See `docs/SPEC.md` §3 and §5.

## Sample data — replace before launch

The schemas are strict, so files cannot carry a "sample" flag. Placeholder text is prefixed with
`[Sýnishorn]` (is) / `[Sample]` (en, and single-language fields) instead.

| File                     | Status                                                                                                                                                 |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `artworks.json`          | Real images. To confirm with the estate: `year` (only ART-0003's "2012" was read from the signature), `medium`, English titles, `available-as-reprint` |
| `site.json`              | Real                                                                                                                                                   |
| `about/biography.json`   | Portrait and birth/death years are real; places, lede, body and pull quote are **sample**                                                              |
| `about/exhibitions.json` | Real, from the previous website: venue and city copied verbatim (Icelandic, as written there), year/month/season only, no titles                       |
| `about/albums.json`      | Real photos; alt text drafted from the photos — to be reviewed by the estate. Hólmaröst `-12` and `-13` are damaged at source (bottom half grey)       |
| `about/press.json`       | **Sample**, with placeholder files `public/press/sample-*`                                                                                             |

After adding or replacing images, run `pnpm images:blur` to fill `blurDataURL`. For the full
step-by-step, see [Adding an artwork](../../README.md#adding-an-artwork) in the root README.
