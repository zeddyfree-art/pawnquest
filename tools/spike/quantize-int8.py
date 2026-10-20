import sys
from onnxruntime.quantization import quantize_dynamic, QuantType
quantize_dynamic(sys.argv[1], sys.argv[2], weight_type=QuantType.QInt8)
