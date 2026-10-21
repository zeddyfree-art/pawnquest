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
| 4c | The world: a drawn map with a winding path through every rank and scenery per region (done, v0.5); music per region from the Ninja Adventure pack (CC0) (done, v0.6) | done |
| — | Feedback round (v0.5): clearer digits, the hero preview stays in view while you make it, training games are unrated, Continue button at the bottom, speech beside the speaker, "What to study" on the profile | done (v0.5) |
| 4d | Installable PWA and offline play, once everything is well tested | later |
| 5 | Calibration: 9,360 bot-vs-bot games measured every character's strength; each now shows its measured rating (557 to 2137), and the map shows them as figures on the path (v0.6.1). Next: real players 400–1200 | bots done |
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

## Calibration (phase 5, October 2026)

`tools/calibrate` plays every character against the others at its ladder step and everyone one step up, with
the app's own bot (book, Maia, temperament, random moves at the bottom, resigning), 80 games per pair, 9,360
games in all. An Elo fit (anchored on the ladder's mean) gives each character's measured strength, and that is
now its rating. Findings:

- The ladder came out compressed: 557 to 2137 instead of 400 to 2500. A top around 2200 is fine for the game.
- Within a step, temperament matters a lot: steady and cold characters are up to 350 points stronger than
  chaotic ones at the same Maia Elo. Zed and the Jester now play with a human temperament (their openings keep
  them wild); the others keep the strength they have.
- Errors (Stockfish depth 10, Lichess thresholds): about 2.5–3.4 blunders per 40 moves at 400–600 (partly the
  deliberate random moves), 1.2–2.2 at 1000–1200, about 1 at 1400–1600, 0.5–0.8 at 1800–2000 and 0.35–0.7 at
  2200 and up. Above 1000 the blunders come from Maia itself, which learned them from human games.

## Rewards for how you play (from the doc "Pawnquest — Unlockables & Rewards", October 2026)

Batch 1 (v0.7): quests in four groups — good habits (think first, clean game, spotless, lesson learned, never
give up, finish the job, mate maker, bold challenger, take a breather, explorer), the road (5 to 500 games, win
or lose), study (1 to 100 reviews, reviewed wins, ten habit breakers) and conquest (the old quests); titles with a
picker; 11 new gear items, 3 boards and 3 piece sets; good-habit chips (+10 XP) and a kind line after three
losses on the result screen. Reviews are summarised on the game record, so they keep counting past 50.
Pets that grow (v0.7): a little gift at 25 games together, grown up at 100.

Batch 2 (v0.8, chosen in the wishlist): the puzzle book (the better moves from your reviews, found yourself
with hints in steps, as in the Repertoire app; Second chance at 5 first tries, milestones at 10, 25 and 50), the
passport (a stamp per region, Map Table board), Friend of the Realm, victory effects by level, Professor Hoot's
glasses and cap, and "✓ Reviewed" on reviewed games.
Not now (maybe much later): map banners and the Library (opening scrolls, chess codex, bestiary lore).
