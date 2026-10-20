# Pawnquest — Brief

The original brief (2026-10-20). Decisions taken after the first review are in
[phase0-concept.md](phase0-concept.md#decisions-taken-after-reviewing-the-brief); where they differ, they win:
no Lichess database dump for books, bots resign and accept draws, a 400 training dummy, no streaks, and the
79M model allowed as an extra download.

## Vision and decisions

Build a free, open-source web app where players start at rating 600 and climb a ladder of 30 pixel-art RPG
characters, each one a human-like Maia-3 bot at a fixed rating, with clear progress and a plain-English game
review.

**Audience:** age 12 and up. UI language: English. Feel: Duolingo (path, friendly feedback) meets chess.com
(game review, rating) in a pixel-art RPG world.

**Decisions already taken**

- Engine: Maia-3, one model with Elo as input (not the old 9 separate Maia-1 nets).
- Roster: 10 ranks of 200 points (600 to 2400) x 3 factions = 30 characters, plus 1 final boss.
- Factions differ by opening repertoire and temperament: Gambiteers, Classicists, Strategists.
- Rating: player starts at 600; Elo goes up and down with every game; auto-match picks a fitting bot, free
  choice allowed with bigger risk/reward.
- Analysis: Stockfish in the browser, explained in plain English, plus Maia-based "what players at your level
  do" insights.
- Art: pixel art in one consistent style.
- Platform: web app first (installable PWA), Android later.
- No accounts in v1: all progress stored on the device, with export/import of a save file.
- License: AGPL-3.0 (required by Maia-3), repo public on GitHub.

**Reference projects:** Mobile Maia (offline Maia-3 + Stockfish on Android, AGPL) and lichess.org
(open-source analysis, accuracy formula, opening data).

## Engine: Maia-3 in the browser

Use the `maia3-js` package with the bundled 5M model (about 21 MB, ONNX, runs in the browser via
onnxruntime-web). One model serves every character: the bot's Elo is just an input.

- Run Maia in a Web Worker so the board never freezes. Cache the model in IndexedDB after first download.
- Maia-3 conditions on up to 8 prior positions: pass the game history, not just the FEN.
- It predicts a probability per legal move with no search. The bot samples from that distribution.
- Set both self Elo (the bot) and opponent Elo (the player's current rating), mirroring the UCI options
  `SelfElo` / `OppoElo`.
- Mask illegal moves before sampling.

**Temperature and top-p (personality knobs)**

| Temperament | Temperature | TopP | Feels like |
| --- | --- | --- | --- |
| Chaotic | 1.3 to 1.6 | 0.98 | wild, blunders often |
| Human (default) | 1.0 | 0.9 | a real player at that level |
| Steady | 0.6 | 0.85 | consistent, fewer swings |
| Cold | 0.2 | 0.7 | near-argmax, merciless |

Starting points only; final values come out of calibration.

**Calibration warning:** Maia plays somewhat above its nominal rating, because it averages a crowd of
players at that level. Low-rated characters need extra randomness to really play like 600. The app's numbers
are its own scale.

## Character roster

30 characters across 5 worlds (2 ranks per world), 3 factions per rank, plus the Necromancer King as final
boss at 2500 (and, after review, Straw Sam the Training Dummy at 400). Names are a first draft; they live in
one data file (`characters.ts`).

| Faction | Colour | As White | As Black vs 1.e4 | As Black vs 1.d4 | Temperament |
| --- | --- | --- | --- | --- | --- |
| Gambiteers | red / fire | 1.e4: King's Gambit, Danish, Evans, Scotch Gambit, Smith-Morra | Sicilian (sharp lines), Scandinavian, Latvian at low ranks | Budapest, Albin, Benko | chaotic to human |
| Classicists | blue / steel | 1.e4: Italian, Ruy Lopez, Scotch | 1...e5 | Queen's Gambit Declined | human |
| Strategists | green / stone | 1.d4 (London, Queen's Gambit), 1.c4, 1.Nf3 | Caro-Kann, French | Slav, King's Indian | steady to cold |

| Rank | World | Gambiteer | Classicist | Strategist | Book depth (moves) |
| --- | --- | --- | --- | --- | --- |
| 600 | The Gutter | Pip the Pickpocket | Old Tom the Beggar | Moss the Hermit | 2 to 3 |
| 800 | The Gutter | Brawling Bess | Hobb the Farmhand | Nell the Rat Catcher | 3 to 4 |
| 1000 | The Village | Zed the Fire-Juggler | Squire Aldric | Grunwald the Miller | 4 to 5 |
| 1200 | The Village | Morwen the Hedge Witch | Bram the Blacksmith | Captain Holt of the Guard | 5 to 6 |
| 1400 | The Castle | The Jester | Sir Cedric, Knight Errant | Bishop Anselm | 6 to 7 |
| 1600 | The Castle | Vex the Assassin | The Royal Champion | The Spymaster | 7 to 8 |
| 1800 | The Wilds | Scarlet, Pirate Queen | Thorne the Ranger | Elder Oakhart, Druid | 8 to 10 |
| 2000 | The Wilds | Ignis the Dragon Tamer | Solenne the Archmage | The Frost Giant | 10 to 12 |
| 2200 | The Underworld | Azgar, Demon General | Count Draven, Vampire | The Bone Oracle | 12 to 14 |
| 2400 | The Underworld | The Hellfire Witch-Queen | The Death Knight | The Lich | 14 to 16 |
| 2500 | Final boss | The Necromancer King (plays all three styles) | | | 16+ |

**What makes each character feel different (no engine changes needed)**

- Opening book: the faction's repertoire, cut to the rank's book depth.
- Temperament: temperature/top-p; Gambiteers lean chaotic, Strategists lean cold.
- Think time: fake delay per move (faster for Gambiteers, slow and deliberate for the Lich).
- Voice: 5 to 10 short, family-friendly lines per character (game start, capture, blunder, win, loss).
- Portrait states: idle, thinking, smug, defeated.

After the book ends (or the opponent leaves book), Maia takes over. The faction style shows mainly through
the structures the opening creates, not through a different middlegame brain.

## Rating, matchmaking and risk/reward

**Formula:** E = 1 / (1 + 10^((R_bot − R_player) / 400)); new rating = R_player + K × (score − E), score
1 / 0.5 / 0. Bot ratings never change.

- K = 40 for the first 20 games, K = 24 after that.
- Rating floor of 400.
- Show the stakes before every game: **WIN +22 / LOSE −2**.

| Opponent vs you | Win (K=24) | Loss (K=24) | Win (K=40) | Loss (K=40) |
| --- | --- | --- | --- | --- |
| 400 above | +22 | −2 | +36 | −4 |
| 200 above | +18 | −6 | +30 | −10 |
| equal | +12 | −12 | +20 | −20 |
| 200 below | +6 | −18 | +10 | −30 |

**Auto-match:** the rank closest to the player's rating, slightly above by default and slightly below after
3 losses in a row (expected score around 0.4 to 0.5); rotate factions, every third game the faction with the
player's worst score; alternate colours.

**Free choice:** any character from the world map, with 1 to 3 skulls by rating gap and the exact WIN/LOSE
numbers.

**Progress:** per character games, W/D/L, best win (fewest moves), first-win date; crowns bronze 1 / silver 3
/ gold 5 wins; per faction score percentage; rating history graph and peak.

## Game review in plain English

Accuracy score, move labels and the 3 key moments explained in one or two plain sentences each. No LLM in v1.

- Engine: Stockfish lite single-threaded WASM in its own Web Worker (GitHub Pages cannot send COOP/COEP).
- Win% = 50 + 50 × (2 / (1 + exp(−0.00368208 × centipawns)) − 1); move and game accuracy as Lichess does it.
- Labels by Win% lost: Best, Excellent (< 2), Good (< 5), Inaccuracy (< 10), Mistake (< 20), Blunder (≥ 20);
  Brilliant only for a sound sacrifice that is the engine's best move.
- Rule-based explanations: hanging piece, missed capture, fork, missed/allowed mate, back rank, trapped
  piece, pin, losing the exchange; fallback "This lost about a pawn. Better was Rd1…".
- Maia insights: "Only 12% of 900-rated players find this move", "the most common mistake at your level",
  "players around 1400 usually see this".
- Review screen: accuracy ring, counts per label, evaluation graph, key moments as swipeable cards with an
  arrow for the better move and "Try again" against the same bot.

## Design direction

Pixel-art RPG world, Duolingo-level friendliness and clarity, never copying their branding or assets.

1. World map (home): a vertical path through the worlds; each node a rank with its 3 characters.
2. Pre-match card: portrait, name, faction, rating, taunt, risk skulls, WIN/LOSE, colour, "Fight!".
3. Battle screen: board, portrait with speech bubble, player bar, move list behind a tap, optional eval bar
   (off by default).
4. Result screen: victory/defeat animation, rating change, crown, Review and Rematch.
5. Review screen.
6. Bestiary / Hall of Heroes: all portraits, greyed out until first win.
7. Profile: rating graph, peak, totals, save export/import.
8. Settings and themes.

No streaks, no ads, no purchases, no chat, no accounts, no leaderboards in v1. XP per game and crown; level-ups
unlock board themes (wood, dungeon stone, forest, ice, lava, 1-bit green) and piece sets (start from
SpicyGame's CC0 16×16 pieces). One fixed palette (e.g. Endesga 32) with faction accents; Press Start 2P for
headings, Nunito for body text; `image-rendering: pixelated`, integer scaling; chiptune juice that respects
reduced motion.

## Tech stack

| Part | Choice |
| --- | --- |
| Build / language | Vite + TypeScript |
| UI | React |
| State | Zustand |
| Rules | chessops (as in the first app) |
| Board | chessground (GPL-3.0) |
| Bot engine | maia3-js + onnxruntime-web in a Web Worker |
| Analysis engine | Stockfish lite single-threaded WASM in a Web Worker |
| Storage | IndexedDB |
| Offline / install | vite-plugin-pwa |
| Tests | Vitest (logic), Playwright (flows) |
| Hosting | GitHub Pages |
| Android (later) | Capacitor |

Privacy: no accounts, tracking or analytics; model and Stockfish served from the app's own origin.
Performance budget: bot move under 300 ms (5M) on a mid-range phone, full review under 20 seconds.

## Build plan

0. Engine spike and calibration concept — [phase0-concept.md](phase0-concept.md).
1. Playable core: board, rules, one bot, game end (mate, stalemate, repetition, 50-move, resign, draw),
   Elo update, IndexedDB save.
2. Roster and progression: `characters.ts`, faction opening trees, book-then-Maia bot, auto-match, free choice,
   crowns and stats, world map.
3. Game review: Stockfish worker, accuracy, labels, explanations, Maia insights, key-moment cards.
4. Look and feel: pixel art, pieces, boards, themes, sounds, bestiary, profile, PWA.
5. Calibration of the whole ladder; playtests around 400–1200.
6. Later: Android, link with the repertoire app, more piece sets, optional cloud backup.

**Working agreements:** game logic pure and unit-tested, UI thin; every tunable number in one config file;
ask before adding any dependency that phones home or needs a server.

## Links

- maia3-js (npm) and its ONNX checkpoints; CSSLab/maia3 (official code, UCI options); Chessformer paper (ICLR 2026)
- Mobile Maia: github.com/Dash1971/maia-chess-android (AGPL-3.0)
- zeddyfree-art/chess: the first app (repertoire trainer)
- Stockfish.js (nmrugg); Lichess accuracy page; lichess-org/chess-openings
- Pixel pieces: spicygame.itch.io/chess-pieces (CC0), joytree-studios.itch.io/chess (CC0), bz-game.itch.io/pixel-art-chess-set (CC0)
