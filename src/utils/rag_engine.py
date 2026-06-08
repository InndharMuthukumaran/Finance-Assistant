import os
import sys
import json
import argparse
import numpy as np

# Suppress warnings for clean stdout JSON
os.environ["TOKENIZERS_PARALLELISM"] = "false"

def load_and_chunk(file_path):
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Source file not found at {file_path}")
    
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Normalize line endings
    content = content.replace("\r\n", "\n")
    
    # Simple semantic chunking: Split by double newlines (paragraphs/sections)
    raw_paragraphs = content.split("\n\n")
    chunks = []
    current_section = "General Reference"
    
    for para in raw_paragraphs:
        para = para.strip()
        if not para:
            continue
        
        # If it starts with a header, extract it but don't necessarily skip the whole block
        # unless it's ONLY a header.
        lines = para.split("\n")
        if lines[0].startswith("#"):
            current_section = lines[0].replace("#", "").strip()
            if len(lines) == 1:
                continue
            # Remove the header line from the paragraph text
            para = "\n".join(lines[1:]).strip()
            if not para:
                continue
            
        # Add context of the section to the chunk
        context_para = f"[{current_section}] {para}"
        chunks.append(context_para)
        
    return chunks

def build_index(source_file, index_dir):
    from sentence_transformers import SentenceTransformer
    import faiss
    
    print("Loading document and splitting into chunks...", file=sys.stderr)
    chunks = load_and_chunk(source_file)
    print(f"Created {len(chunks)} chunks.", file=sys.stderr)
    
    print("Loading SentenceTransformer model ('all-MiniLM-L6-v2')...", file=sys.stderr)
    model = SentenceTransformer("all-MiniLM-L6-v2")
    
    print("Generating embeddings...", file=sys.stderr)
    embeddings = model.encode(chunks, show_progress_bar=True)
    embeddings = np.array(embeddings).astype("float32")
    
    # FAISS Index definition
    dimension = embeddings.shape[1]
    index = faiss.IndexFlatIP(dimension)  # IndexFlatIP uses Inner Product (Cosine Similarity if normalized)
    
    # Normalize vectors for Cosine Similarity
    faiss.normalize_L2(embeddings)
    index.add(embeddings)
    
    # Ensure save directory exists
    os.makedirs(index_dir, exist_ok=True)
    
    # Save the index and the chunk texts
    faiss_path = os.path.join(index_dir, "faiss_index.bin")
    chunks_path = os.path.join(index_dir, "chunks.json")
    
    faiss.write_index(index, faiss_path)
    with open(chunks_path, "w", encoding="utf-8") as f:
        json.dump(chunks, f, indent=2)
        
    print("Vector database indexing complete!", file=sys.stderr)
    print(f"Index saved to: {faiss_path}", file=sys.stderr)
    print(f"Chunks saved to: {chunks_path}", file=sys.stderr)

def search_index(query, index_dir, top_k=2):
    from sentence_transformers import SentenceTransformer
    import faiss
    
    faiss_path = os.path.join(index_dir, "faiss_index.bin")
    chunks_path = os.path.join(index_dir, "chunks.json")
    
    if not os.path.exists(faiss_path) or not os.path.exists(chunks_path):
        print(json.dumps({"error": "Index not found. Please run with --index first."}))
        return
        
    # Load model, index, and chunks
    model = SentenceTransformer("all-MiniLM-L6-v2")
    index = faiss.read_index(faiss_path)
    with open(chunks_path, "r", encoding="utf-8") as f:
        chunks = json.load(f)
        
    # Generate query embedding
    query_vector = model.encode([query])
    query_vector = np.array(query_vector).astype("float32")
    faiss.normalize_L2(query_vector)
    
    # Search index
    distances, indices = index.search(query_vector, top_k)
    
    results = []
    for dist, idx in zip(distances[0], indices[0]):
        if idx < len(chunks) and idx >= 0:
            results.append({
                "score": float(dist),
                "text": chunks[idx]
            })
            
    # Output raw JSON to stdout
    print(json.dumps(results, indent=2))

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Python FAISS RAG Engine")
    parser.add_argument("--index", action="store_true", help="Build the vector index")
    parser.add_argument("--query", type=str, help="Search query")
    parser.add_argument("--top-k", type=int, default=2, help="Number of results to return")
    
    args = parser.parse_args()
    
    # Define absolute paths
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) # src/
    source_file = os.path.join(base_dir, "data", "financial_guide.txt")
    index_dir = os.path.join(base_dir, "data", "faiss_index")
    
    if args.index:
        build_index(source_file, index_dir)
    elif args.query:
        search_index(args.query, index_dir, args.top_k)
    else:
        parser.print_help()
