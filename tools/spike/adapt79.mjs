// Lets maia3-js drive the Mobile Maia 79M export: renames inputs/outputs and adds the 97th (time) channel.
import * as ort from "onnxruntime-node";
const proto = Object.getPrototypeOf(await ort.InferenceSession.create(new URL("./node_modules/maia3-js/models/maia3_5m.onnx", import.meta.url).pathname));
const run = proto.run;
proto.run = async function (feeds, ...rest) {
  if (!this.inputNames.includes("opponent_elo")) return run.call(this, feeds, ...rest);
  const t = feeds.tokens, [b] = t.dims, src = t.data, dst = new Float32Array(b * 64 * 97);
  for (let i = 0; i < b * 64; i++) dst.set(src.subarray(i * 96, i * 96 + 96), i * 97);
  const out = await run.call(this, { tokens: new ort.Tensor("float32", dst, [b, 64, 97]), self_elo: feeds.self_elo, opponent_elo: feeds.oppo_elo }, ...rest);
  return { logits_move: out.move_logits, logits_value: out.value_logits };
};
