"""Maia-3 79M (Mobile Maia's ONNX export) -> int8, as a drop-in for maia3-js.

1. Dynamic int8 quantisation of the weights: 316 MB -> 82 MB, about 3x faster, same top move in 95% of positions.
2. Same interface as the 5M model: input tokens [b,64,96] (the 97th, unused time channel is padded with zeros
   inside the graph), inputs self_elo / oppo_elo, outputs logits_move / logits_value; the ponder output is dropped.

Usage: python convert.py maia3-79m.onnx maia3_79m_int8.onnx
"""
import os
import sys
import tempfile

import onnx
from onnx import TensorProto, helper
from onnxruntime.quantization import QuantType, quantize_dynamic

src, dst = sys.argv[1], sys.argv[2]
with tempfile.TemporaryDirectory() as tmp:
    q = os.path.join(tmp, "int8.onnx")
    quantize_dynamic(src, q, weight_type=QuantType.QInt8)
    m = onnx.load(q)

g = m.graph
for i in g.input:
    if i.name == "tokens":
        i.type.tensor_type.shape.dim[2].dim_value = 96
    if i.name == "opponent_elo":
        i.name = "oppo_elo"
for n in g.node:
    n.input[:] = ["oppo_elo" if x == "opponent_elo" else ("tokens_97" if x == "tokens" else x) for x in n.input]
g.initializer.append(helper.make_tensor("pq_pads", TensorProto.INT64, [6], [0, 0, 0, 0, 0, 1]))
g.node.insert(0, helper.make_node("Pad", ["tokens", "pq_pads"], ["tokens_97"], mode="constant"))
rename = {"move_logits": "logits_move", "value_logits": "logits_value"}
for n in g.node:
    n.output[:] = [rename.get(x, x) for x in n.output]
keep = [o for o in g.output if o.name != "ponder"]
for o in keep:
    o.name = rename.get(o.name, o.name)
del g.output[:]
g.output.extend(keep)
onnx.checker.check_model(m)
onnx.save(m, dst)
