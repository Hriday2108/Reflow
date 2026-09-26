import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { GoogleGenAI } from '@google/genai';

/**
 * One-time ingestion: chunk every file under /knowledge-base, embed each chunk
 * with Gemini text-embedding-004, and store them in the `policychunks`
 * collection for retrieval-augmented grounding.
 *
 * Run with:  npx tsx scripts/ingest-policies.ts
 *
 * For MongoDB Atlas Vector Search, create a vector index named
 * "policy_vector_index" on the `policychunks` collection over the `embedding`
 * field (768 dimensions, cosine). Retrieval falls back to in-memory cosine
 * similarity if the index is absent, so this is optional for a demo.
 */

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const EMBEDDING_MODEL = 'gemini-embedding-001';
const KB_DIR = path.resolve(process.cwd(), 'knowledge-base');

if (!MONGODB_URI) {
  console.error('Please define MONGODB_URI in .env.local');
  process.exit(1);
}
if (!GEMINI_API_KEY) {
  console.error('Please define GEMINI_API_KEY in .env.local');
  process.exit(1);
}

const policyChunkSchema = new mongoose.Schema({
  _id: { type: String, required: true, default: () => new mongoose.Types.ObjectId().toString() },
  source: { type: String, required: true },
  text: { type: String, required: true },
  embedding: { type: [Number], required: true },
  created_at: { type: String, default: () => new Date().toISOString() },
}, { _id: false });

const PolicyChunk = mongoose.models.PolicyChunk || mongoose.model('PolicyChunk', policyChunkSchema);

/** Split text into chunks on markdown headings / blank lines, ~1000 chars max. */
function chunkText(text: string): string[] {
  const blocks = text.split(/\n(?=#{1,6}\s)/); // split on markdown headings
  const chunks: string[] = [];
  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;
    if (trimmed.length <= 1200) {
      chunks.push(trimmed);
    } else {
      // Further split long sections on blank lines.
      let buf = '';
      for (const para of trimmed.split(/\n\s*\n/)) {
        if ((buf + '\n\n' + para).length > 1200 && buf) {
          chunks.push(buf.trim());
          buf = para;
        } else {
          buf = buf ? buf + '\n\n' + para : para;
        }
      }
      if (buf.trim()) chunks.push(buf.trim());
    }
  }
  return chunks;
}

async function main() {
  await mongoose.connect(MONGODB_URI as string);
  console.log('Connected to MongoDB');

  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

  if (!fs.existsSync(KB_DIR)) {
    console.error(`Knowledge base directory not found: ${KB_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(KB_DIR).filter((f) => /\.(md|txt)$/i.test(f));
  if (files.length === 0) {
    console.error('No .md/.txt files found in knowledge-base/');
    process.exit(1);
  }

  // Fresh ingest — clear previous chunks.
  await PolicyChunk.deleteMany({});
  console.log('Cleared existing policy chunks');

  let total = 0;
  for (const file of files) {
    const raw = fs.readFileSync(path.join(KB_DIR, file), 'utf-8');
    const chunks = chunkText(raw);
    for (const text of chunks) {
      const res = await ai.models.embedContent({ model: EMBEDDING_MODEL, contents: text });
      const embedding = res.embeddings?.[0]?.values;
      if (!embedding || embedding.length === 0) {
        console.warn(`  ! Skipped a chunk from ${file} (no embedding)`);
        continue;
      }
      await PolicyChunk.create({ source: file, text, embedding });
      total++;
    }
    console.log(`Ingested ${chunks.length} chunk(s) from ${file}`);
  }

  console.log(`\nDone. Stored ${total} policy chunk(s).`);
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('Ingestion failed:', err);
  process.exit(1);
});
