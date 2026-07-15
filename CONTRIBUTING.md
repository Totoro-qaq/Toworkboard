# Contributing

Thanks for helping make Toworkboard calmer, safer, and more useful.

## Before opening a pull request

1. Use synthetic notes, addresses, mail subjects, and screenshots.
2. Do not add character art, traced assets, proprietary screenshots, or unlicensed fonts.
3. Do not add telemetry or new network destinations without updating `PRIVACY.md` and providing an explicit user-facing reason.
4. Keep mail mutations out of scope unless a future design explicitly adds confirmation and narrower permissions.
5. Run `npm run verify`.

## Interface contributions

Follow `PRODUCT.md` and `DESIGN.md`. Preserve keyboard focus, reduced-motion behavior, light/dark themes, independent Mailroom scrolling, and English interface copy. Demo note titles may use their original language.

## Commit hygiene

Never commit `data.json`, `.env` files, tokens, authorization codes, OAuth responses, client secrets, personal vault paths, or private images. If a secret enters Git history, revoke it immediately; deleting the visible line is not sufficient.

