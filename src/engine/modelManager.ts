import RNFS from 'react-native-fs';
import { initLlama } from 'llama.rn';

const MODEL_URL =
  'https://huggingface.co/v-ShivaPrasad/qwen-rag-student-gguf/resolve/main/qwen-rag-Q4_K_M.gguf';
const MODEL_FILENAME = 'qwen-rag-Q4_K_M.gguf';
const MODEL_PATH = RNFS.DocumentDirectoryPath + '/' + MODEL_FILENAME;
const MODEL_TEMP_PATH = MODEL_PATH + '.tmp';

let llamaContext: any = null;

export const modelExists = async (): Promise<boolean> => {
  const exists = await RNFS.exists(MODEL_PATH);
  if (exists) {
    const stat = await RNFS.stat(MODEL_PATH);
    // Verify file is not empty or too small (model should be ~400MB)
    const isValid = stat.size > 100 * 1024 * 1024; // > 100MB
    console.log('[MODEL] File exists, size:', stat.size, 'valid:', isValid);
    if (!isValid) {
      console.log('[MODEL] File too small, deleting corrupt file...');
      await RNFS.unlink(MODEL_PATH);
      return false;
    }
    return true;
  }
  return false;
};

export const downloadModel = async (
  onProgress: (pct: number, downloaded: number, total: number) => void
): Promise<void> => {
  console.log('[MODEL] Starting download...');

  // Clean up any partial downloads
  if (await RNFS.exists(MODEL_TEMP_PATH)) {
    console.log('[MODEL] Removing partial download...');
    await RNFS.unlink(MODEL_TEMP_PATH);
  }
  if (await RNFS.exists(MODEL_PATH)) {
    console.log('[MODEL] Removing incomplete model file...');
    await RNFS.unlink(MODEL_PATH);
  }

  const downloadJob = RNFS.downloadFile({
    fromUrl: MODEL_URL,
    toFile: MODEL_TEMP_PATH,
    headers: {
      'User-Agent': 'RagApp/1.0',
    },
    connectionTimeout: 30000,
    readTimeout: 30000,
    progress: (res) => {
      const pct = Math.floor((res.bytesWritten / res.contentLength) * 100);
      console.log(`[MODEL] Progress: ${pct}% ${(res.bytesWritten/1024/1024).toFixed(1)}MB / ${(res.contentLength/1024/1024).toFixed(1)}MB`);
      onProgress(pct, res.bytesWritten, res.contentLength);
    },
    progressDivider: 1,
  });

  try {
    const result = await downloadJob.promise;
    console.log('[MODEL] Download complete, status:', result.statusCode);

    if (result.statusCode !== 200) {
      await RNFS.unlink(MODEL_TEMP_PATH).catch(() => {});
      throw new Error(`Download failed with status ${result.statusCode}`);
    }

    // Verify downloaded file size
    const stat = await RNFS.stat(MODEL_TEMP_PATH);
    console.log('[MODEL] Downloaded size:', stat.size);

    if (stat.size < 100 * 1024 * 1024) {
      await RNFS.unlink(MODEL_TEMP_PATH).catch(() => {});
      throw new Error('Downloaded file too small — download may be corrupt');
    }

    // Move temp to final path
    await RNFS.moveFile(MODEL_TEMP_PATH, MODEL_PATH);
    console.log('[MODEL] Model saved to:', MODEL_PATH);

  } catch (e: any) {
    // Clean up temp file on error
    await RNFS.unlink(MODEL_TEMP_PATH).catch(() => {});
    throw new Error(`Download failed: ${e.message}`);
  }
};

export const loadModel = async (): Promise<void> => {
  if (llamaContext) return;
  console.log('[MODEL] Loading model from:', MODEL_PATH);
  llamaContext = await initLlama({
    model: MODEL_PATH,
    n_ctx: 4096,
    n_threads: 4,
    n_batch: 512,
  });
  console.log('[MODEL] Model loaded successfully');
};

export const getContext = () => llamaContext;
export const isModelLoaded = () => !!llamaContext;