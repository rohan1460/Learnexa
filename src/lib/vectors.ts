import { prisma } from "./prisma";
import { getEmbedding, hasRealApiKey } from "./gemini";

/**
 * Generate an embedding vector for a given text string.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  if (!hasRealApiKey()) {
    return mockEmbedding(text);
  }

  try {
    return await getEmbedding(text);
  } catch (error: any) {
    console.error("Embedding API Error (falling back to mock):", error?.message || error);
    return mockEmbedding(text);
  }
}


/**
 * Compute cosine similarity between two vectors.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;

  return dotProduct / denominator;
}

/**
 * Find the top-K most similar note chunks for a user given a query.
 */
export async function findSimilarChunks(
  query: string,
  userId: string,
  topK: number = 5
): Promise<{ content: string; similarity: number }[]> {
  // Get the query embedding
  const queryEmbedding = await generateEmbedding(query);

  // Fetch all chunks belonging to the user's notes
  const chunks = await prisma.noteChunk.findMany({
    where: {
      note: {
        userId: userId,
      },
    },
    select: {
      id: true,
      content: true,
      embedding: true,
    },
  });

  if (chunks.length === 0) return [];

  // Compute similarities
  const scored = chunks
    .filter((chunk) => chunk.embedding) // Only chunks with embeddings
    .map((chunk) => {
      const chunkEmbedding: number[] = JSON.parse(chunk.embedding!);
      const similarity = cosineSimilarity(queryEmbedding, chunkEmbedding);
      return { content: chunk.content, similarity };
    })
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);

  return scored;
}

/**
 * Generate a deterministic mock embedding from text (for dev/demo without API key).
 * Uses a simple hash-based approach to produce a 768-dim vector.
 */
function mockEmbedding(text: string): number[] {
  const dim = 768;
  const embedding: number[] = new Array(dim);
  let hash = 0;

  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }

  for (let i = 0; i < dim; i++) {
    // Use a pseudo-random sequence seeded by the hash
    hash = ((hash * 1103515245 + 12345) & 0x7fffffff);
    embedding[i] = (hash / 0x7fffffff) * 2 - 1; // Range [-1, 1]
  }

  // Normalize
  const norm = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
  for (let i = 0; i < dim; i++) {
    embedding[i] /= norm;
  }

  return embedding;
}
