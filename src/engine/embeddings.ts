import * as ort from 'onnxruntime-react-native';
import { TokenizerLoader } from '@lenml/tokenizers';
import RNFS from 'react-native-fs';

let session: ort.InferenceSession | null = null;
let tokenizer: any = null;

const MODELS_DIR = RNFS.DocumentDirectoryPath + '/models';

const loadTokenizer = async () => {
  if (tokenizer) return;
  const tokenizerJson = await RNFS.readFile(MODELS_DIR + '/tokenizer.json', 'utf8');
  const tokenizerConfig = await RNFS.readFile(MODELS_DIR + '/tokenizer_config.json', 'utf8');
  tokenizer = TokenizerLoader.fromPreTrained({
    tokenizerJSON: JSON.parse(tokenizerJson),
    tokenizerConfig: JSON.parse(tokenizerConfig),
  });
};

export const loadEmbedder = async (): Promise<void> => {
  if (session && tokenizer) return;

  const modelDest = MODELS_DIR + '/model_int8.onnx';
  const tokDest = MODELS_DIR + '/tokenizer.json';
  const tokConfigDest = MODELS_DIR + '/tokenizer_config.json';

  const modelExists = await RNFS.exists(modelDest);
  if (!modelExists) {
    await RNFS.mkdir(MODELS_DIR).catch(() => {});
    await RNFS.copyFileAssets('models/model_int8.onnx', modelDest);
    await RNFS.copyFileAssets('models/tokenizer.json', tokDest);
    await RNFS.copyFileAssets('models/tokenizer_config.json', tokConfigDest);
  }

  // 1.14.0 requires file:// prefix
  session = await ort.InferenceSession.create('file://' + modelDest);
  await loadTokenizer();
};

const meanPooling = (
  outputData: Float32Array,
  attentionMask: number[],
  seqLen: number,
  hiddenSize: number
): number[] => {
  const result = new Array(hiddenSize).fill(0);
  let maskSum = 0;
  for (let i = 0; i < seqLen; i++) {
    if (attentionMask[i] === 1) {
      maskSum++;
      for (let j = 0; j < hiddenSize; j++) {
        result[j] += outputData[i * hiddenSize + j];
      }
    }
  }
  return result.map(v => v / maskSum);
};

const normalize = (vec: number[]): number[] => {
  const norm = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
  return vec.map(v => v / (norm + 1e-9));
};

export const generateEmbedding = async (text: string): Promise<number[]> => {
  if (!session || !tokenizer) await loadEmbedder();

  console.log('[EMB] Encoding text:', text.slice(0, 50));

  // @lenml/tokenizers returns array of token IDs directly
  const encoded = tokenizer.encode(text, { add_special_tokens: true });
  console.log('[EMB] encoded type:', typeof encoded, 'isArray:', Array.isArray(encoded));
  console.log('[EMB] encoded length:', encoded.length);

  const inputIds: number[] = Array.from(encoded);
  const attentionMask: number[] = inputIds.map((id: number) => id !== 0 ? 1 : 0);
  const tokenTypeIds: number[] = new Array(inputIds.length).fill(0);
  const seqLen = inputIds.length;

  console.log('[EMB] seqLen:', seqLen);
  console.log('[EMB] sample token ids:', inputIds.slice(0, 10));

  let results: any;
  try {
    const feeds = {
      input_ids: new ort.Tensor('int64', BigInt64Array.from(inputIds.map(BigInt)), [1, seqLen]),
      attention_mask: new ort.Tensor('int64', BigInt64Array.from(attentionMask.map(BigInt)), [1, seqLen]),
      token_type_ids: new ort.Tensor('int64', BigInt64Array.from(tokenTypeIds.map(BigInt)), [1, seqLen]),
    };
    console.log('[EMB] Running ONNX session...');
    results = await session!.run(feeds);
    console.log('[EMB] ONNX output keys:', Object.keys(results));
  } catch (ortErr: any) {
    console.error('[EMB] ONNX session.run FAILED:', ortErr.message);
    throw ortErr;
  }

  const outputKey = Object.keys(results)[0];
  const outputData = results[outputKey].data as Float32Array;
  console.log('[EMB] outputData length:', outputData.length);

  const hiddenSize = outputData.length / seqLen;
  console.log('[EMB] hiddenSize:', hiddenSize);

  const pooled = meanPooling(outputData, attentionMask, seqLen, hiddenSize);
  const normalized = normalize(pooled);
  console.log('[EMB] Final embedding length:', normalized.length);
  return normalized;
};