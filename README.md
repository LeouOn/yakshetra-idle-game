# Yakshetra

An idle game about a life and the world it leaves behind.

You live a life: you work, give, sit with other beings, study, and
meditate. Each of those deeds leaves **residue**. On the studio bench you
gather a window of that residue and cook it, and when it is ready you
harvest a keepsake (in the code, a **Manifest**): a thing, an outcome, a
change, a person, or a place. Keepsakes pin onto later work, and the
people and places you harvest assemble into a **world**: first a
household, then an organization, a town, a city, and on up to a whole
world. The world is the prize.

The lives are set in two eras: late Tang China, and the Garden of
Arrivals, an original fantasy realm. The bench keeps working while you
are away, so coming back has something waiting.

Built with Expo SDK 57 and strict TypeScript, for web, iOS, and Android.

- **What the game is:** [`SPEC.md`](SPEC.md)
- **How to work in this repo:** [`AGENTS.md`](AGENTS.md)

`SPEC.md` supersedes older documents in the repo (`CONTRIBUTING.md`,
`ARCHITECTURE.md`, `advisory/`, `docs/roadmap.md`) where they disagree.

---

## Running it

Requires Node 20+ and pnpm (the lockfile is committed).

```bash
pnpm install
pnpm exec expo start --web
```

The project uses development builds, not Expo Go. For iOS and Android,
use the EAS profiles in `eas.json` (iOS builds need Xcode 26).

Checks, in this order:

```bash
pnpm exec expo export --platform web   # builds dist/, which the a11y test reads
pnpm tsc --noEmit
pnpm lint
pnpm test
```

`pnpm check` runs all four.

Harvests are written from authored tables by default. An optional
model-backed filler exists (see `SPEC.md` section 16.2); it reads its
provider keys from the environment, never from the app bundle, and falls
back to the tables if the model fails.

---

## Where to find things

| Want                         | Path                                                   |
| ---------------------------- | ------------------------------------------------------ |
| Routes (home, life, studio)  | `app/`                                                 |
| Pure game engine             | `src/engine/` (no React, no platform APIs, seeded RNG) |
| Era packs and content        | `src/content/packs/`, `src/content/progression/`       |
| Player-facing strings        | `src/i18n/en.json`                                     |
| Saves                        | `src/persistence/`                                     |
| Studio bench UI              | `src/ui/components/StudioView.tsx`                     |
| Design notes and evaluations | `docs/design/`                                         |

---

## On the Buddhist content

Yakshetra draws on Mahāyāna Buddhist themes and imagery. Named Buddhas,
bodhisattvas, historical teachers, yakṣas, and real mantras can appear as
figures and material in the game.

It is a game, not a teaching. It does not claim the authority of a
sangha, offer a lineage or an initiation, or stand in for a teacher, and
it never tells the player they have attained anything real. There is no
karma or merit meter, a gift never cancels a harm, and a past life never
decides who someone is born as. The six practices (generosity, careful
conduct, patient courage, joyful effort, collected attention,
discernment) are ways of acting in a life, not a score.

---

## License

[MIT](LICENSE).
