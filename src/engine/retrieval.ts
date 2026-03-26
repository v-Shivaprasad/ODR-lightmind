import { getAllChunks } from '../db/database';
import { generateEmbedding } from './embeddings';

const cosineSimilarity = (a: number[], b: number[]): number => {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
};

export const retrieveTopChunks = async (
  query: string,
  topK = 3
): Promise<{ text: string; score: number }[]> => {
  const queryEmbedding = await generateEmbedding(query);
  const chunks = getAllChunks();

  const scored = chunks.map(chunk => ({
    text: chunk.chunk_text,
    score: cosineSimilarity(queryEmbedding, chunk.embedding),
  }));

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
};