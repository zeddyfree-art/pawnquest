# Pawnquest

Climb a ladder of pixel-art RPG characters, each a human-like chess bot (Maia-3) at a fixed rating, from
Straw Sam the Training Dummy (400) to the Necromancer King (2500). Free, open source, and everything runs on
your device: no account, no tracking, your progress stays in your browser (with a save file to export).

Status: **v0.6: music**. See [docs/brief.md](docs/brief.md) for the plan and
[docs/phase0-concept.md](docs/phase0-concept.md) for how the bots work and how they were measured.

## What is in it

- **World map**: a quest path through 7 worlds, 32 opponents (3 factions per rank), your position on it, and a
  **Play** button that picks a fitting opponent (a bit above you, a bit below after three losses in a row, factions
  rotated, every third game the faction you score worst against, colours alternating).
- **Pre-match card**: portrait, faction, taunt, risk skulls and exactly what a win, draw or loss does to your rating.
- **Battle**: 15+10 clocks, pixel board and pieces, the opponent's speech bubble, resign, offer a draw, move list,
  pause (the game waits for you, and your clock with it).
- **Bots**: each plays its own opening book (hand-written, per the roster), then Maia-3 at its rating with its
  temperament; the lowest ranks blunder now and then; they think like humans, resign hopeless games (from 1000 up)
  and accept a draw only in an endgame they are not winning.
- **Rating**: Elo against fixed-rating bots, K = 40 for the first 20 games then 24, floor 400.
- **Progress**: crowns per opponent (bronze, silver, gold at 1, 3, 5 wins), Hall of Heroes, faction scores, XP and
  levels, rating graph, save export/import.
- **Game review** (v0.2): Stockfish 19 on your device checks every move.
  - Accuracy (Lichess' formula) and labels from Brilliant to Blunder.
  - An evaluation graph.
  - Up to three key moments explained in plain English: hanging piece, missed or allowed mate, fork, pin, missed
    capture, overlooked threat, or what the move cost.
  - Maia insights: "Only 12% of 900-rated players find this move", "This is the most common mistake at your level",
    "Players around 1400 usually see this".
  - **Try again** replays the position against the same bot (not rated).
- **Board** always fits the screen; captured pieces and the material difference are shown.
- **Look** (v0.3, "cozy valley"): warm daylight, parchment panels in wooden frames, Pixelify Sans headings.
- **Your hero** (v0.4): pick a class (Squire, Apprentice, Ranger, Bard) and a look; six gear slots (head, face,
  body, legs, main hand, off hand) plus a pet. Every opponent drops their own item the first time you beat them.
  Quests unlock boards, piece sets and pets; levels unlock more hair styles and colours. All unlocks are derived
  from your game history, so an imported save unlocks the same things.
  - 64×64 pieces with soft shading and gold details.
  - A board per region: meadow, cobblestone, oak, castle stone, forest moss, obsidian and royal marble.
    You can also pick one board for everywhere.
  - A drawn backdrop per region behind the fight, with ambient particles: leaves, rain, pollen, dust, fireflies,
    embers and sparkles.
  - Portraits of all 32 characters in four moods, built from parts (hair, headwear, clothing, beard, accessories).
  - A notice when a new version is published.

All art is drawn in code (`src/ui/pieces.ts`, `boards.ts`, `scene.ts`, `portraits.ts`, `src/data/looks.ts`).

- **The world map** (v0.5): one tall pixel-art map drawn in code, with a winding path through every rank, region
  signs, a moat in front of the castle and scenery per region; tap a stone to see who waits there.
- **What to study** (v0.5): the profile sums up your reviewed games: the mistakes that come back most, the phase
  of the game where you err most, and what to practise for each.

- **Music** (v0.6): a tune for the map and one per region in a fight, crossfaded, with jingles for the result
  and for new rewards; Music and volume in Settings.

- **Rewards for how you play** (v0.7): quests for good habits, games played (win or lose) and reviews; titles;
  pets that grow with you (a little gift after 25 games together, grown up after 100).
- **Puzzle book** (v0.8): every clear mistake in a reviewed game becomes a puzzle: find the better move yourself,
  with hints in steps (the piece to move, the idea, then the move). On the profile, and "Find it yourself" on each
  key moment of a review. Quests: *Second chance* (5 at the first try) and 10, 25 and 50 solved.
- **Also in v0.8**: a passport with a stamp per region you have played in (a full one gives the Map Table board),
  *Friend of the Realm* for a game against all 32 characters, a victory effect after a win (one more at levels 3,
  5, 8, 12, 16 and 20, picked on the Hero screen), Professor Hoot's reading glasses (10 reviews) and graduation
  cap (50), and a green "✓ Reviewed" on games you have already reviewed.
- **Automatic reviews** (v0.8.1): games you have not reviewed yet are reviewed in the background, newest first,
  whenever no game is being played; opening one jumps the queue. The puzzle book shows the opponent's last move,
  and after the answer the position after it, with the engine's line.

Next: (once everything is well tested) offline play as an installable app. See [docs/roadmap.md](docs/roadmap.md).

## Develop

```sh
npm install                      # also copies the bundled Maia-3 5M model into public/models
pip install -r tools/models/requirements.txt
npm run fetch-models             # builds public/models/maia3_79m_int8.onnx (downloads 316 MB once)
npm run dev                      # or: npm run build && npm run preview
npm test                         # logic tests (Vitest)
npm run e2e                      # browser smoke tests against the build (Playwright)
```

All tunable numbers (K-factors, temperatures, think times, resign and draw rules) live in `src/config.ts`; the
roster is `src/data/characters.ts` and the opening books are `src/data/openings.ts`.

## Credits

- [Maia-3](https://github.com/CSSLab/maia3) (CSSLab, University of Toronto, AGPL-3.0): the human-like chess model.
- [maia3-js](https://www.npmjs.com/package/maia3-js) (MIT): JavaScript inference and the bundled 5M model.
- [Mobile Maia](https://github.com/Dash1971/maia-chess-android) (AGPL-3.0): the ONNX export of the 79M model,
  its human think-time model and draw rule.
- [chessground](https://github.com/lichess-org/chessground) and [chessops](https://github.com/niklasf/chessops)
  (GPL-3.0) from Lichess.
- Fonts: Pixelify Sans and Nunito (SIL Open Font License), served from the app itself.
- Music and jingles: [Ninja Adventure](https://pixel-boy.itch.io/ninja-adventure-asset-pack) by Pixel-boy and
  AAA (CC0), converted to MP3 in `public/audio` (see `public/audio/README.md`).

## License

AGPL-3.0, as required by the Maia-3 model weights.
