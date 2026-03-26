import { getContext } from './modelManager';
import { retrieveTopChunks } from './retrieval';

export const runRAG = async (
  query: string,
  onToken: (token: string) => void,
  onSources: (sources: { text: string; score: number }[]) => void
): Promise<string> => {
  console.log('[RAG] =============================');
  console.log('[RAG] QUESTION:', query);

  const sources = await retrieveTopChunks(query);
  onSources(sources);

  console.log('[RAG] RETRIEVED', sources.length, 'chunks:');
  sources.forEach((s, i) => {
    console.log(`[RAG] --- Chunk ${i + 1} | score: ${s.score.toFixed(4)} ---`);
    console.log('[RAG]', s.text.slice(0, 200));
  });

  const context = sources.map(s => s.text).join('\n\n');
  const prompt = `Context: ${context}\n\nQuestion: ${query}\nAnswer:`;

  console.log('[RAG] PROMPT LENGTH:', prompt.length);
  console.log('[RAG] PROMPT PREVIEW:', prompt.slice(0, 400));

  const llamaCtx = getContext();
  if (!llamaCtx) throw new Error('Model not loaded');

  let fullResponse = '';
  console.log('[RAG] GENERATING...');

await llamaCtx.completion(
  {
    prompt,
    n_predict: 256,
    stop: [
      '</s>',
      '<|endoftext|>',
      '\nQuestion:',
      '\nContext:',
      '\n\n\n',
      '\n\n',              // add this — stops after first paragraph
    ],
    temperature: 0.1,
    top_p: 0.95,
    repeat_penalty: 1.4,
    repeat_last_n: 128,
  },
    (data: { token: string }) => {
      fullResponse += data.token;
      onToken(data.token);
    }
  );

  console.log('[RAG] ANSWER:', fullResponse);
  console.log('[RAG] ANSWER LENGTH:', fullResponse.length);
  console.log('[RAG] =============================');

  return fullResponse;
};