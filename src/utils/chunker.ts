const CHUNK_SIZE = 120;   // number of words per chunk
const OVERLAP = 20;       // number of overlapping words

export const chunkText = (text: string): string[] => {
  if (!text || text.trim().length === 0) return [];

  // Split into sentences
  const sentences = text.match(/[^.!?\n]+[.!?\n]+|[^.!?\n]+$/g) || [text];

  const chunks: string[] = [];
  let currentWords: string[] = [];

  for (const sentence of sentences) {
    const sentenceWords = sentence.trim().split(/\s+/);

    // If adding this sentence exceeds chunk size
    if (currentWords.length + sentenceWords.length > CHUNK_SIZE) {
      if (currentWords.length > 0) {
        chunks.push(currentWords.join(' ').trim());
      }

      // Apply overlap
      const overlapWords = currentWords.slice(-OVERLAP);
      currentWords = [...overlapWords, ...sentenceWords];
    } else {
      currentWords.push(...sentenceWords);
    }
  }

  // Push remaining words
  if (currentWords.length > 0) {
    chunks.push(currentWords.join(' ').trim());
  }

  return chunks;
};