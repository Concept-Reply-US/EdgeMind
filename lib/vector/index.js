/**
 * @module lib/vector
 * @description Vector storage module for anomaly persistence using ChromaDB.
 * Provides semantic search over historical anomalies for RAG-based context enrichment.
 */

const { InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');
const CONFIG = require('../config');

// TTL for stored anomalies (24 hours in milliseconds)
const ANOMALY_TTL_MS = 24 * 60 * 60 * 1000;

// Runtime dependencies (set via init)
let chromaClient = null;
let collection = null;
let bedrockClientInstance = null;
let isInitialized = false;
let useLocalEmbeddings = false;

/**
 * Initialize the vector storage module with runtime dependencies
 * @param {Object} deps - Dependencies object
 * @param {Object} deps.bedrockClient - AWS Bedrock client instance for embeddings
 */
async function init({ bedrockClient }) {
  if (isInitialized) {
    console.log('Vector store already initialized');
    return;
  }

  try {
    // Lazy import chromadb to avoid onnxruntime issues at module load time
    const { ChromaClient } = require('chromadb');
    
    bedrockClientInstance = bedrockClient;
    useLocalEmbeddings = process.env.NODE_ENV !== 'production';

    const chromaHost = process.env.CHROMA_HOST || 'localhost';
    const chromaPort = process.env.CHROMA_PORT || '8000';
    chromaClient = new ChromaClient({
      path: `http://${chromaHost}:${chromaPort}`
    });
    console.log(`Connecting to ChromaDB at ${chromaHost}:${chromaPort}`);

    // For local dev, skip collection creation to avoid onnxruntime issues
    // The vector store will be disabled but the server will still run
    if (useLocalEmbeddings) {
      console.log('Vector store disabled for local development (onnxruntime compatibility)');
      isInitialized = false;
      return;
    }

    // Production: we provide embeddings via Bedrock Titan
    collection = await chromaClient.getOrCreateCollection({
      name: 'edgemind_anomalies',
      metadata: {
        description: 'Factory anomaly history for RAG-based context enrichment',
        created: new Date().toISOString()
      }
    });

    isInitialized = true;
    console.log('Vector store initialized (Bedrock embeddings)');

    // Start periodic TTL purge (every hour)
    setInterval(() => {
      purgeExpiredAnomalies().catch(err =>
        console.warn('Periodic purge error:', err.message)
      );
    }, 60 * 60 * 1000);

    // Run initial purge on startup
    purgeExpiredAnomalies().catch(err =>
      console.warn('Initial purge error:', err.message)
    );
  } catch (error) {
    console.error('Failed to initialize vector store:', error.message);
    isInitialized = false;
  }
}

/**
 * Generate embedding for text using AWS Bedrock Titan Embeddings
 * @param {string} text - Text to embed
 * @returns {Promise<number[]>} Embedding vector
 */
async function generateEmbedding(text) {
  if (!bedrockClientInstance) {
    throw new Error('Bedrock client not initialized');
  }

  const payload = {
    inputText: text.substring(0, 8000),
    dimensions: 512,
    normalize: true
  };

  const command = new InvokeModelCommand({
    modelId: CONFIG.bedrock.embeddingModelId,
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify(payload)
  });

  const response = await bedrockClientInstance.send(command);
  const result = JSON.parse(new TextDecoder().decode(response.body));
  return result.embedding;
}

/**
 * Store an anomaly with its embedding in ChromaDB
 * @param {Object} anomaly - Anomaly object from Claude analysis
 * @param {Object} insight - Parent insight object containing timestamp
 */
async function storeAnomaly(anomaly, insight) {
  if (!isInitialized || !collection) {
    console.warn('Vector store not initialized, skipping anomaly storage');
    return;
  }

  try {
    const text = [
      anomaly.description || '',
      anomaly.reasoning || '',
      anomaly.metric ? `Metric: ${anomaly.metric}` : '',
      anomaly.enterprise ? `Enterprise: ${anomaly.enterprise}` : ''
    ].filter(Boolean).join('. ');

    if (!text.trim()) {
      console.warn('Empty anomaly text, skipping storage');
      return;
    }

    const id = `anomaly_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const metadata = {
      enterprise: anomaly.enterprise || 'unknown',
      metric: anomaly.metric || 'unknown',
      severity: anomaly.severity || 'low',
      timestamp: insight.timestamp || new Date().toISOString(),
      actual_value: String(anomaly.actual_value || ''),
      threshold: String(anomaly.threshold || ''),
      description: anomaly.description || ''
    };

    if (useLocalEmbeddings) {
      // Local: let ChromaDB server generate embeddings
      await collection.add({
        ids: [id],
        documents: [text],
        metadatas: [metadata]
      });
    } else {
      // Production: use Bedrock embeddings
      const embedding = await generateEmbedding(text);
      await collection.add({
        ids: [id],
        embeddings: [embedding],
        documents: [text],
        metadatas: [metadata]
      });
    }

    console.log(`Stored anomaly: ${id} (${anomaly.severity})`);
  } catch (error) {
    console.error('Failed to store anomaly:', error.message);
  }
}

/**
 * Find similar historical anomalies using semantic search
 * @param {string} queryText - Text to find similar anomalies for
 * @param {number} limit - Maximum number of results to return
 * @returns {Promise<Array>} Array of similar anomalies with metadata
 */
async function findSimilarAnomalies(queryText, limit = 5) {
  if (!isInitialized || !collection) {
    return [];
  }

  try {
    const count = await collection.count();
    if (count === 0) {
      return [];
    }

    let results;
    if (useLocalEmbeddings) {
      // Local: let ChromaDB server generate query embedding
      results = await collection.query({
        queryTexts: [queryText],
        nResults: Math.min(limit, count)
      });
    } else {
      // Production: use Bedrock embeddings
      const queryEmbedding = await generateEmbedding(queryText);
      results = await collection.query({
        queryEmbeddings: [queryEmbedding],
        nResults: Math.min(limit, count)
      });
    }

    if (!results.ids || !results.ids[0] || results.ids[0].length === 0) {
      return [];
    }

    // Post-filter: only return anomalies within TTL
    const cutoff = new Date(Date.now() - ANOMALY_TTL_MS).toISOString();
    const validIndices = results.ids[0]
      .map((id, i) => ({ id, i, ts: results.metadatas[0][i]?.timestamp }))
      .filter(item => !item.ts || item.ts >= cutoff)
      .map(item => item.i);

    if (validIndices.length === 0) {
      return [];
    }

    return validIndices.map(i => ({
      id: results.ids[0][i],
      document: results.documents[0][i],
      metadata: results.metadatas[0][i],
      distance: results.distances?.[0]?.[i] || 0
    }));
  } catch (error) {
    console.error('Failed to find similar anomalies:', error.message);
    return [];
  }
}

/**
 * Get the count of stored anomalies
 * @returns {Promise<number>} Number of anomalies in the collection
 */
async function getAnomalyCount() {
  if (!isInitialized || !collection) {
    return 0;
  }

  try {
    return await collection.count();
  } catch (error) {
    console.error('Failed to get anomaly count:', error.message);
    return 0;
  }
}

/**
 * Check if the vector store is initialized and ready
 * @returns {boolean} True if initialized
 */
function isReady() {
  return isInitialized;
}

/**
 * Purge anomalies older than TTL from the collection.
 * @returns {Promise<number>} Number of purged entries
 */
async function purgeExpiredAnomalies() {
  if (!isInitialized || !collection) {
    return 0;
  }

  try {
    const cutoff = new Date(Date.now() - ANOMALY_TTL_MS).toISOString();

    // Get all items to check timestamps
    const count = await collection.count();
    if (count === 0) return 0;

    // Fetch all metadata (ChromaDB where filter on timestamps is unreliable with ISO strings)
    const all = await collection.get({
      limit: count,
      include: ['metadatas']
    });

    if (!all.ids || all.ids.length === 0) return 0;

    const expiredIds = all.ids.filter((id, i) => {
      const ts = all.metadatas[i]?.timestamp;
      return ts && ts < cutoff;
    });

    if (expiredIds.length > 0) {
      await collection.delete({ ids: expiredIds });
      console.log(`🗑️ Purged ${expiredIds.length} expired anomalies (older than 24h)`);
    }

    return expiredIds.length;
  } catch (error) {
    console.error('Failed to purge expired anomalies:', error.message);
    return 0;
  }
}

/**
 * Purge ALL anomalies from the collection (full reset).
 * @returns {Promise<number>} Number of purged entries
 */
async function purgeAll() {
  if (!isInitialized || !collection) {
    return 0;
  }

  try {
    const count = await collection.count();
    if (count === 0) return 0;

    // Delete the collection and recreate it
    await chromaClient.deleteCollection('edgemind_anomalies');
    collection = await chromaClient.getOrCreateCollection({
      name: 'edgemind_anomalies',
      metadata: {
        description: 'Factory anomaly history for RAG-based context enrichment',
        created: new Date().toISOString()
      }
    });

    console.log(`🗑️ Purged ALL ${count} anomalies (full reset)`);
    return count;
  } catch (error) {
    console.error('Failed to purge all anomalies:', error.message);
    return 0;
  }
}

module.exports = {
  init,
  generateEmbedding,
  storeAnomaly,
  findSimilarAnomalies,
  getAnomalyCount,
  isReady,
  purgeExpiredAnomalies,
  purgeAll
};
