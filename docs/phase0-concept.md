# Phase 0 — concept and engine spike

Status: in progress (2026-10-20). This note answers "how does a Pawnquest bot choose a move, and how do we
know a 1400 character really plays like 1400?" before any UI is built. Numbers marked *measured* come from
runs in this phase; everything else is a starting value that calibration replaces.

## Decisions taken after reviewing the brief

| Topic | Decision |
| --- | --- |
| Time control | Always 15+10 for both sides. The bot plays fast (a few seconds a move, like Duolingo's Oscar); its time comes off its own clock. |
| Opening books | No Lichess database dump. Each faction gets a small hand-written opening tree; Maia's own probabilities at the character's rating choose between the moves in it. |
| Resign and draw | The player can resign and offer a draw. Bots can accept a draw and resign (rules below). |
| Training dummy | A 400-rated "Straw Sam the Training Dummy" below the first world, so a player near the 400 floor always has a beatable opponent. |
| Streaks | None. XP and crowns only. |
| Model | Maia-3 5M bundled; the 79M model is allowed as an extra download (no size limit) where calibration shows it is needed. |
| Art | Placeholders in the first test app; final pixel art made by Claude with the tools available here. |
| Repo | `zeddyfree-art/pawnquest`, AGPL-3.0. |

## What the spike measured

### Maia-3 5M (`maia3-js` 0.2.0, bundled model)

- Model file 22.5 MB; loads in 0.15 s; one forward pass about 12 ms on one server CPU thread (*measured*).
  Expect roughly 50–150 ms in single-threaded WASM on a mid-range phone.
- `predict()` defaults to `topK: 5`, which runs one extra forward pass per candidate (6 passes per move).
  The bot must call it with `topK: 0`.
- Human-like at the low end (*measured*): after 1.e4 e5 2.Bc4 Nc6 3.Qh5, a 600 player answers 3…Nf6?? (mate in
  one) 32% of the time; with the mate on the board, 600 finds Qxf7# 73% of the time, 2500 does so 95% of the time.
- Temperature 0 is deterministic: 20 games 1500 vs 1500 were the same game.

Bot vs bot, temperature 1.0, top-p 0.9, 40 games per pair (±7% noise):

| Pair | Lower side scored | Elo predicts |
| --- | --- | --- |
| 600 vs 800 | 26% | 24% |
| 600 vs 1000 | 19% | 9% |
| 1400 vs 1600 | 41% | 24% |
| 2200 vs 2400 | 45% | 24% |

The rating input separates players well near the bottom and hardly at all near the top. With the 5M model
alone, every character from about 1800 up would feel the same.

### Maia-3 79M (Mobile Maia's ONNX export)

- Mobile Maia (Flutter, AGPL-3.0, github.com/Dash1971/maia-chess-android) bundles an ONNX export of the
  official 79M checkpoint: 316,034,244 bytes, SHA-256 `3454b03a…d8010`, documented in its MODEL_PROVENANCE.md.
  Downloaded from GitHub LFS and checked against that hash.
- Different tensor names from the `maia3-js` export: inputs `tokens [b,64,97]` (96 history channels plus an
  unused time channel), `self_elo`, `opponent_elo` (int64); outputs `move_logits`, `value_logits`, `ponder`.
  A small adapter lets `maia3-js` drive it (pad channel 97 with zeros, rename tensors).
- About 100 ms per forward pass on one server thread, 3 s to load (*measured*). Phone: estimate 0.5–1.5 s a
  move, which fits a 15+10 game because the bot's fake think time is longer anyway.
- **int8 version** (onnxruntime dynamic quantisation, `tools/spike/quantize-int8.py`): 81.6 MB instead of
  316 MB, 32 ms instead of 89 ms per pass, same top move as the full model in 95% of 127 game positions, mean
  total-variation distance 0.026 between the two move distributions (*measured*).

Bot vs bot with 79M (40 games per pair, or 60 for int8), temperature 1.0 unless noted, top-p 0.9:

| Pair | Model | Lower side scored | Elo predicts |
| --- | --- | --- | --- |
| 600 vs 800 | 79M | 24% | 24% |
| 1400 vs 1600 | 79M | 28% | 24% |
| 1800 vs 2000 | 79M | 40% | 24% |
| 2200 vs 2400 | 79M | 41% | 24% |
| 2200 vs 2400 | 79M int8 | 40% | 24% |
| 1800 (T 1.0) vs 2000 (T 0.8) | 79M int8 | 22% | 24% |
| 2200 (T 1.0) vs 2400 (T 0.6) | 79M int8 | 25% | 24% |
| 2200 (T 0.6) vs 2400 (T 0.3) | 79M int8 | 23% | 24% |

**Conclusions.** 79M separates the middle of the ladder far better than 5M (1400–1600: 28% vs 41%). At the
top, the rating input alone is not enough for either model, but lowering the temperature of the stronger side
restores the expected gap. So the ladder needs a **temperature schedule by rank** (about 1.0 up to ~1600,
falling towards 0.3–0.6 at 2400), with each temperament as an offset on that schedule, and int8 79M is the
best engine candidate: 82 MB, faster than the full model, and it plays the same.

### Stockfish 19 lite single-threaded (`stockfish` npm 19.0.1)

40-move game (*measured*, server): depth 12 in 1.2 s, depth 14 in 2.8 s, depth 16 in 7.6 s. On a phone
(3–5× slower) depth 16 will not review an 80-ply game in 20 s; use depth 12–14 (or a node budget) and show
the review as it fills in.

## How a bot chooses a move

```
position + last 8 positions
   │
   ├─ 1. Book: still inside the faction tree and within the character's book depth?
   │       → candidate moves = tree moves; weight each by Maia's probability at engineElo; sample.
   │
   ├─ 2. Maia: forward pass with self_elo = engineElo, oppo_elo = player's rating.
   │       → mask illegal moves, softmax, temperature, top-p (nucleus) → sample.
   │
   ├─ 3. Low ranks only: with probability blunderPct play a uniformly random legal move
   │       (makes 400–800 bots beatable for real beginners; Maia alone plays above its label there).
   │
   ├─ 4. Top ranks only (if calibration needs it): blunder guard — a shallow Stockfish check rejects
   │       a move that drops more than X Win% and samples again.
   │
   └─ 5. Think time: drawn from a log-normal per faction (Gambiteers 1–4 s, Classicists 2–6 s,
           Strategists 3–9 s, the Lich slower), capped by the bot's own clock; never below 0.5 s.
```

Every number here lives per character in `characters.ts` (`engineElo`, `temperature`, `topP`, `blunderPct`,
`bookDepth`, `thinkMin`/`thinkMax`, `model`), with shared defaults in one config file.

**Displayed rating vs engine Elo.** The rating shown to the player is the character's fixed ladder rating.
The Elo fed to Maia (`engineElo`) is a tuning knob, and so are temperature and top-p. A chaotic Gambiteer and a
cold Strategist at 1400 use different knob settings, chosen by calibration so that both score like a 1400.
Personality and strength are separate.

**History input.** Maia-3 can take the last 8 positions. Mobile Maia defaults to the current position only
(its notes report "opening copying" with history on). We test both in calibration and keep whichever plays
more naturally; the encoder supports both.

## Bot resign and draw rules (first version)

Borrowed from Mobile Maia and adapted for a 12+ audience learning to finish games:

- **Accepting a draw offer:** only in an endgame (little material left) and only when Stockfish's evaluation
  for the bot is ≤ +0.3 pawns (Mobile Maia uses 30 centipawns), or the bot is being mated.
- **Offering a draw:** the bot offers a draw in a dead-level endgame (|eval| < 0.2 for 10 moves) at most once
  per 20 moves.
- **Resigning:** from rank 1000 up, when the evaluation stays below −6 pawns (or mate against it) for
  4 moves in a row. Below 1000 the bot never resigns before mate: beginners should practise mating.
- Threefold repetition, 50-move rule, stalemate, insufficient material and time-out end the game as usual
  (timeout with insufficient mating material is a draw).

## Calibration plan

Goal: a 200-point gap gives the lower character about 24% (Elo's expectation), across the whole ladder, and
each character's measured strength is within ±50 of its displayed rating.

1. **Tool:** `tools/calibrate.ts` (Node, onnxruntime-node, 1 thread per process, one process per CPU core)
   plays character-vs-character games with the real bot pipeline (book, sampling, blunders), colours
   alternated, capped at 300 plies (adjudicated by Stockfish after that).
2. **Rating fit:** Bradley–Terry / Elo maximum likelihood over all games (as BayesElo does), anchored so
   Straw Sam = 400. Each pair plays 100–200 games (±3.5–5% → about ±25–35 Elo).
3. **Tuning loop:** for each character, adjust `engineElo` first (and `temperature` for the extremes)
   until its fitted rating matches its ladder rating; then re-run neighbours. Ranks are tuned bottom-up.
4. **Model per rank:** 79M int8 (82 MB) wherever it plays measurably better; candidates are "79M int8
   everywhere" (one engine, one download) or "5M for The Gutter and The Village, 79M int8 from The Castle up"
   (fast first start). Decided by the full calibration plus a phone speed test.
5. **Human check:** a few real games at 400–1200 (you, family, friends); adjust `blunderPct` at the bottom.

Results appear in the roster artifact so they can be checked next to each character.

## Code we reuse

| From | What |
| --- | --- |
| zeddyfree-art/chess (GPL-3.0, own code) | Maia worker (download, SHA-256 check, IndexedDB cache), Stockfish worker, Lichess Win%/accuracy (`analysis.ts`), tactical themes (`themes.ts`: mate, fork, pin, hanging, material), Maia "players at your level" insight, clock, sound, chessground board setup |
| maia3-js (MIT) | Board/history encoding, move index tables, sampling with temperature and top-p, batch inference |
| Mobile Maia (AGPL-3.0) | 79M ONNX export and its provenance, human think-time distribution, draw-acceptance rule, classification test fixtures (Stockfish 18 reference labels) |
| Lichess (lichess-org/chess-openings, CC0) | Opening names for the faction trees |

## Art

The first test app uses generated placeholder sprites (as in the roster artifact). There is no image
generator in this environment, so the final art is drawn as pixel data: one fixed palette (Endesga 32),
32×32 or 48×48 busts, four expressions per character made by editing one base sprite. The art is our own
work and can be published as CC0. The pieces start from SpicyGame's CC0 16×16 set.

## Next steps

1. Measure 79M int8 and 5M speed in a real phone browser (onnxruntime-web, single thread).
2. Scaffold the app (Vite + React + TypeScript + Zustand + chessground), port the Maia and Stockfish workers.
3. `characters.ts` from the approved roster; faction opening trees.
4. `tools/calibrate.ts` with the real bot pipeline; first full ladder calibration.
5. Phase 1: one playable bot, game end detection, resign/draw, Elo update, IndexedDB save.
