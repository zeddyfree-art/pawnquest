# Ladder calibration

Every character plays its neighbours (the others at its rank, and everyone one rank up) with the app's own bot:
book, Maia at its engine Elo, temperament and temperature, random moves at the lowest ranks, resigning. An Elo
fit over all games then gives each character's measured strength next to its ladder rating.

```sh
npm run fetch-models                                        # the 79M int8 model, if not there yet
npm i --no-save --ignore-scripts onnxruntime-node@1.23      # the Node engine, for this tool only
npm run calibrate -- --games 40 --out baseline              # all ranks, 40 games per pair
npm run calibrate -- --games 40 --knobs try.json --out try1 # with other knobs (see src/data/calibration.ts)
npm run calibrate -- --only 1400-1800 --out castle          # part of the ladder
```

Games are stored in `.cache/calibration/<out>.jsonl` (a run that stops can be resumed with the same `--out`), the
summary in `<out>.json`. One process per CPU core; the 5M network plays about 3 games a second on four cores.

The fit anchors the scale so that the average measured rating equals the average ladder rating: calibration
fixes the gaps between characters. The absolute level follows Maia, which is trained to play like Lichess
players of the given rating.
