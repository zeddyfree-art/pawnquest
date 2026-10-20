# Phase 0 spike scripts

Throwaway Node scripts behind the numbers in [docs/phase0-concept.md](../../docs/phase0-concept.md). They will
be replaced by `tools/calibrate.ts`, which plays with the real bot pipeline.

Setup (outside the app, in any folder):

```sh
npm i --ignore-scripts maia3-js@0.2.0 onnxruntime-node chess.js stockfish@19.0.1
```

The 79M model is Mobile Maia's ONNX export (AGPL-3.0, SHA-256
`3454b03ae78baa64a87b345fdb1a457265d912caec531039b074f07eda0d8010`):
`https://media.githubusercontent.com/media/Dash1971/maia-chess-android/main/assets/models/maia3-79m.onnx`

| Script | What it does |
| --- | --- |
| `adapt79.mjs` | Import first: lets `maia3-js` run the 79M export (other tensor names, 97 input channels). |
| `match3.mjs` | Bot vs bot: `node match3.mjs <eloA> <tempA> <eloB> <tempB> <games>`; `M=<model.onnx>` for 79M. |
| `qcmp.mjs` | Full vs int8 79M: top-move agreement, distribution distance, speed. |
| `quantize-int8.py` | Dynamic int8 quantisation: `python quantize-int8.py in.onnx out.onnx` (needs `onnx onnxruntime`). |
| `stockfish-speed.cjs` | Stockfish 19 lite single-threaded speed per depth on a 40-move game. |
