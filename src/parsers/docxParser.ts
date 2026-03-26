import RNFS from 'react-native-fs';
import { unzip } from 'react-native-zip-archive';

export const extractDocxText = async (filePath: string): Promise<string> => {
  console.log('[DOCX] Starting extraction:', filePath);

  const tempDir = RNFS.DocumentDirectoryPath + '/docx_' + Date.now();

  try {
    console.log('[DOCX] Creating temp dir:', tempDir);
    await RNFS.mkdir(tempDir);

    const zipPath = tempDir + '/file.zip';
    console.log('[DOCX] Reading file as base64...');
    const base64 = await RNFS.readFile(filePath, 'base64');
    console.log('[DOCX] Base64 length:', base64.length);

    console.log('[DOCX] Writing zip to temp...');
    await RNFS.writeFile(zipPath, base64, 'base64');

    console.log('[DOCX] Unzipping...');
    await unzip(zipPath, tempDir);
    console.log('[DOCX] Unzip complete');

    const xmlPath = tempDir + '/word/document.xml';
    const xmlExists = await RNFS.exists(xmlPath);
    console.log('[DOCX] document.xml exists:', xmlExists);

    if (!xmlExists) throw new Error('word/document.xml not found in DOCX');

    console.log('[DOCX] Reading document.xml...');
    const xml = await RNFS.readFile(xmlPath, 'utf8');
    console.log('[DOCX] XML length:', xml.length);

    const text = xml
      .replace(/<w:br[^/]*/g, '\n')
      .replace(/<w:p[^>]*>/g, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, ' ')
      .trim();

    console.log('[DOCX] Extracted text length:', text.length);
    console.log('[DOCX] Preview:', text.slice(0, 200));

    if (!text || text.length < 10) {
      throw new Error('No readable text found in DOCX');
    }

    return text;
  } catch (e: any) {
    console.error('[DOCX] Extraction error:', e.message);
    throw new Error(`DOCX parsing failed: ${e.message}`);
  } finally {
    // Cleanup temp dir
    console.log('[DOCX] Cleaning up temp dir...');
    RNFS.unlink(tempDir).catch(() => {});
  }
};