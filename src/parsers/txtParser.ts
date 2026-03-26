import RNFS from 'react-native-fs';
import { Buffer } from 'buffer';

export const extractTxtText = async (filePath: string): Promise<string> => {
  console.log('[TXT] Starting extraction:', filePath);

  try {
    console.log('[TXT] Trying utf8 read...');
    const text = await RNFS.readFile(filePath, 'utf8');
    console.log('[TXT] utf8 read success, length:', text.length);
    console.log('[TXT] Preview:', text.slice(0, 200));
    return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  } catch (e1: any) {
    console.warn('[TXT] utf8 failed:', e1.message, '— trying base64 fallback');
    try {
      const base64 = await RNFS.readFile(filePath, 'base64');
      const text = Buffer.from(base64, 'base64').toString('utf8');
      console.log('[TXT] base64 fallback success, length:', text.length);
      return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
    } catch (e2: any) {
      console.error('[TXT] Both methods failed:', e2.message);
      throw new Error(`TXT parsing failed: ${e2.message}`);
    }
  }
};