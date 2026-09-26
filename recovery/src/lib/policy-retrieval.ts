import { GoogleGenAI } from '@google/genai';
import dbConnect from '@/lib/db';
import { PolicyChunkModel } from '@/models';

/**
 * Retrieval-augmented grounding for policy/cost details.
 *
 * Embeds a query with Gemini's text-embedding-004 and returns the most
 * relevant policy excerpts from the `policychunks` collection (populated by
 * `scripts/ingest-policies.ts`). Tries MongoDB Atlas Vector Search first and
 * falls back to in-memory cosine similarity when no vector index is present,
 * so retrieval works even before the Atlas index is created.
 */

const EMBEDDING_MODEL = 'gemini-embedding-001';
const VECTOR_INDEX = 'policy_vector_index';

export interface PolicyChunk {
  text: string;
  source: string;
  score?: number;
}

/** Embed a single string into a text-embedding-004 vector. */
export async function embedText(text: string): Promise<number[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('Missing GEMINI_API_KEY for embeddings');
  const ai = new GoogleGenAI({ apiKey });
  const res = await ai.models.embedContent({
    model: EMBEDDING_MODEL,
    contents: text,
  });
  const values = res.embeddings?.[0]?.values;
  if (!values || values.length === 0) throw new Error('Empty embedding returned');
  return values;
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na && nb ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
}

/**
 * Return the top-K policy chunks most relevant to `query`.
 * Returns [] on any failure (missing key, empty KB) so callers can degrade
 * gracefully to "estimate, not policy-verified".
 */
export async function retrievePolicyContext(query: string, topK = 4): Promise<PolicyChunk[]> {
  try {
    await dbConnect();
    const queryVector = await embedText(query);

    // 1. Preferred path: Atlas Vector Search.
    try {
      const results = await PolicyChunkModel.aggregate([
        {
          $vectorSearch: {
            index: VECTOR_INDEX,
            path: 'embedding',
            queryVector,
            numCandidates: 100,
            limit: topK,
          },
        },
        { $project: { _id: 0, text: 1, source: 1, score: { $meta: 'vectorSearchScore' } } },
      ]);
      if (results.length > 0) return results as PolicyChunk[];
    } catch {
      // Vector index not configured — fall through to in-memory scoring.
    }

    // 2. Fallback: in-memory cosine similarity over all chunks (small corpus).
    const chunks = await PolicyChunkModel.find({}).lean() as Array<{ text: string; source: string; embedding: number[] }>;
    if (chunks.length === 0) return [];
    return chunks
      .map((c) => ({ text: c.text, source: c.source, score: cosineSimilarity(queryVector, c.embedding) }))
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .slice(0, topK);
  } catch (err) {
    console.warn('[policy-retrieval] retrieval failed, returning no context:', (err as Error)?.message);
    return [];
  }
}
