import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * RAG Bridge
 * Executes the python RAG script to retrieve relevant document chunks.
 * 
 * @param {string} query - The query to search for semantically
 * @param {number} topK - Number of chunks to retrieve
 * @returns {Promise<Array<{score: number, text: string}>>} - Array of matched chunks
 */
export function queryKnowledgeBase(query, topK = 2) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, 'rag_engine.py');
    
    // Spawn Python process
    const pythonProcess = spawn('python', [
      scriptPath,
      '--query', query,
      '--top-k', topK.toString()
    ]);

    let stdoutData = '';
    let stderrData = '';

    pythonProcess.stdout.on('data', (data) => {
      stdoutData += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      stderrData += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Python process exited with code ${code}. Stderr: ${stderrData}`));
        return;
      }

      try {
        const results = JSON.parse(stdoutData.trim());
        resolve(results);
      } catch (err) {
        reject(new Error(`Failed to parse Python stdout as JSON. Stdout: ${stdoutData}. Error: ${err.message}`));
      }
    });

    pythonProcess.on('error', (err) => {
      reject(new Error(`Failed to start Python process: ${err.message}`));
    });
  });
}

/**
 * Triggers the indexing command on the python RAG engine.
 * @returns {Promise<string>}
 */
export function buildKnowledgeIndex() {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, 'rag_engine.py');
    
    const pythonProcess = spawn('python', [scriptPath, '--index']);

    let stdoutData = '';
    let stderrData = '';

    pythonProcess.stdout.on('data', (data) => {
      stdoutData += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      stderrData += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Indexing failed with code ${code}. Stderr: ${stderrData}`));
        return;
      }
      resolve(stderrData || 'Indexing completed successfully.');
    });

    pythonProcess.on('error', (err) => {
      reject(new Error(`Failed to start indexing process: ${err.message}`));
    });
  });
}
