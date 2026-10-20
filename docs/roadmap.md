# Roadmap

Where Pawnquest stands and what comes next. The design choices for phase 4 are made in the design brief
(an artifact with three style directions and questions on the character, unlocks, regions, map and how the art is
made); this page is updated once they are in.

| Phase | What | Status |
| --- | --- | --- |
| 0 | Engine spike, calibration concept | done |
| 1–2 | Playable core, roster of 32, opening books, auto-match, crowns | done (v0.1) |
| 3 | Game review: accuracy, labels, plain-English key moments, Maia insights, Try again | done (v0.2) |
| 4a | Style "cozy valley", 64px pieces, a board per region, backdrops with ambience, portraits of all 32 characters in four moods | done (v0.3) |
| 4b | Your character (class and look, six gear slots: head, face, body, legs, main hand, off hand, plus a pet); each opponent gives its own item on your first win; 22 quests unlock boards, seven piece sets and ten pets; hair styles and colours unlock with levels | done (v0.4) |
| 4c | The world: a drawn map with a winding path through every rank and scenery per region (done, v0.5); music per region from the Ninja Adventure pack (CC0) (next) | in progress |
| — | Feedback round (v0.5): clearer digits, the hero preview stays in view while you make it, training games are unrated, Continue button at the bottom, speech beside the speaker, "What to study" on the profile | done (v0.5) |
| 4d | Installable PWA and offline play, once everything is well tested | later |
| 5 | Calibration of the whole ladder (bot vs bot, then real players 400–1200) | planned |
| 6 | Android, link with the repertoire app, more piece sets | later |

## Wishes collected so far (October 2026)

- Pixel art that is more precise and modern, in the spirit of Stardew Valley, Arcanterra and Philna Fantasy.
- Make your own character and upgrade it by winning.
- Unlockable board themes and piece sets.
- Backgrounds that depend on the region you play in.
- A real drawn map with the path visible on it.

## Design choices (from the design brief, October 2026)

| Question | Choice |
| --- | --- |
| Style | Cozy valley (warm, Stardew-like) |
| Default pieces | Fine pixel art (64px) |
| Your character | Class + look; six gear slots chosen by Claude: head, face, body, legs, main hand, off hand, plus a pet |
| Earning | Quests + levels; also an item per opponent ("not only per level, but per character in that level") |
| Unlocks | Board themes, piece sets, gear, pets |
| Regions | Living backdrops (ambient animation) |
| Map | A drawn path upwards |
| Board in a fight | The region's own, can be changed |
| Art | Drawn by Claude in code; CC0 music and sound from Ninja Adventure (pixel-boy) for the regions |

## Art production

Claude has no image generator in this environment: anything it makes itself is drawn as pixel data in code (as
the current pieces and placeholder portraits are). For Stardew-level portraits and backdrops the options are
AI-generated images run through a palette-and-pixel pipeline (`tools/pixelize`), CC0/open asset packs, or a mix;
the design brief asks which.
