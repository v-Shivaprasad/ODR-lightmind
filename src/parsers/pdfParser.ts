import RNFS from 'react-native-fs';
import { Buffer } from 'buffer';

export const extractPdfText = async (filePath: string): Promise<string> => {
  console.log('[PDF] Starting extraction:', filePath);

  try {
    console.log('[PDF] Reading file as base64...');
    const base64 = await RNFS.readFile(filePath, 'base64');
    console.log('[PDF] Base64 length:', base64.length);

    const raw = Buffer.from(base64, 'base64').toString('latin1');
    console.log('[PDF] Raw binary length:', raw.length);

    const textMatches: string[] = [];

    // Method 1: BT/ET blocks
    let count1 = 0;
    const btRegex = /BT[\s\S]*?ET/g;
    let match;
    while ((match = btRegex.exec(raw)) !== null) {
      const block = match[0];
      const tdMatches = block.match(/\(([^)]+)\)/g);
      if (tdMatches) {
        tdMatches.forEach(m => {
          const text = m.slice(1, -1)
            .replace(/\\n/g, '\n')
            .replace(/\\r/g, '')
            .replace(/\\t/g, ' ')
            .replace(/\\\(/g, '(')
            .replace(/\\\)/g, ')')
            .replace(/\\\\/g, '\\')
            .replace(/[^\x20-\x7E\n]/g, '');
          if (text.trim().length > 1) { textMatches.push(text); count1++; }
        });
      }
    }
    console.log('[PDF] Method 1 (BT/ET) found:', count1, 'strings');

    // Method 2: Tj operator
    let count2 = 0;
    const tjRegex = /\(([^)]{1,200})\)\s*Tj/g;
    while ((match = tjRegex.exec(raw)) !== null) {
      const text = match[1].replace(/[^\x20-\x7E]/g, '').trim();
      if (text.length > 1) { textMatches.push(text); count2++; }
    }
    console.log('[PDF] Method 2 (Tj) found:', count2, 'strings');

    // Method 3: TJ array
    let count3 = 0;
    const tjArrayRegex = /\[([^\]]+)\]\s*TJ/g;
    while ((match = tjArrayRegex.exec(raw)) !== null) {
      const block = match[1];
      const strings = block.match(/\(([^)]*)\)/g);
      if (strings) {
        const text = strings.map(s => s.slice(1, -1))
          .join('')
          .replace(/[^\x20-\x7E]/g, '')
          .trim();
        if (text.length > 1) { textMatches.push(text); count3++; }
      }
    }
    console.log('[PDF] Method 3 (TJ array) found:', count3, 'strings');

    const result = [...new Set(textMatches)]
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    console.log('[PDF] Final extracted text length:', result.length);
    console.log('[PDF] Preview:', result.slice(0, 200));

    if (!result || result.length < 10) {
      throw new Error('PDF has no extractable text. It may be scanned or image-based.');
    }

    return result;
  } catch (e: any) {
    console.error('[PDF] Extraction error:', e.message);
    throw new Error(`PDF parsing failed: ${e.message}`);
  }
};