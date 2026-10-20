# Roadmap

Where Pawnquest stands and what comes next. The design choices for phase 4 are made in the design brief
(an artifact with three style directions and questions on the character, unlocks, regions, map and how the art is
made); this page is updated once they are in.

| Phase | What | Status |
| --- | --- | --- |
| 0 | Engine spike, calibration concept | done |
| 1–2 | Playable core, roster of 32, opening books, auto-match, crowns | done (v0.1) |
| 3 | Game review: accuracy, labels, plain-English key moments, Maia insights, Try again | done (v0.2) |
| 4a | Style, pieces and boards: the chosen style direction, new default pieces, 2–3 board themes, portraits of the first worlds with four expressions | next |
| 4b | Your character and unlocks: a character creator, shown on the map and in fights; unlocks (board themes, piece sets, gear, pets, titles, victory effects) earned by playing | planned |
| 4c | The world: a drawn map with a path, a backdrop and ambience per region (rain in the Gutter, fireflies in the Wilds, embers in the Underworld), optional music per region; installable PWA and offline play | planned |
| 5 | Calibration of the whole ladder (bot vs bot, then real players 400–1200) | planned |
| 6 | Android, link with the repertoire app, more piece sets | later |

## Wishes collected so far (October 2026)

- Pixel art that is more precise and modern, in the spirit of Stardew Valley, Arcanterra and Philna Fantasy.
- Make your own character and upgrade it by winning.
- Unlockable board themes and piece sets.
- Backgrounds that depend on the region you play in.
- A real drawn map with the path visible on it.

## Art production

Claude has no image generator in this environment: anything it makes itself is drawn as pixel data in code (as
the current pieces and placeholder portraits are). For Stardew-level portraits and backdrops the options are
AI-generated images run through a palette-and-pixel pipeline (`tools/pixelize`), CC0/open asset packs, or a mix;
the design brief asks which.
