"""
RAG (Retrieval-Augmented Generation) Knowledge System
Ingests agricultural extension documents, extracts chunks, builds vector indices,
and retrieves grounded agricultural context with verifiable citations.
"""

import os
import glob
import math
import re
from typing import List, Dict

class DocumentChunk:
    def __init__(self, doc_name: str, section: str, text: str, chunk_id: str):
        self.doc_name = doc_name
        self.section = section
        self.text = text
        self.chunk_id = chunk_id
        self.word_counts = self._compute_word_counts(text)

    def _compute_word_counts(self, text: str) -> Dict[str, int]:
        words = re.findall(r'\b[a-zA-Z]{3,}\b', text.lower())
        counts = {}
        for w in words:
            counts[w] = counts.get(w, 0) + 1
        return counts

class AgriculturalRAG:
    def __init__(self, knowledge_dir: str = None):
        if not knowledge_dir:
            backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            knowledge_dir = os.path.join(os.path.dirname(backend_dir), "knowledge", "documents")
        
        self.knowledge_dir = knowledge_dir
        self.chunks: List[DocumentChunk] = []
        self.idf = {}
        self.is_indexed = False
        self._build_index()

    def _build_index(self):
        """
        Parses all Markdown/Text documents in the knowledge directory into semantic chunks.
        """
        if not os.path.exists(self.knowledge_dir):
            print(f"[RAG] Knowledge directory does not exist: {self.knowledge_dir}")
            return

        doc_files = glob.glob(os.path.join(self.knowledge_dir, "*.md")) + glob.glob(os.path.join(self.knowledge_dir, "*.txt"))
        if not doc_files:
            print("[RAG] No agricultural documents found in knowledge directory.")
            return

        total_chunks = []
        for file_path in doc_files:
            doc_name = os.path.splitext(os.path.basename(file_path))[0].replace('_', ' ').title()
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()

            # Split by markdown headers (# or ##)
            sections = re.split(r'\n(?=#{1,3}\s)', content)
            for i, sec in enumerate(sections):
                sec_text = sec.strip()
                if not sec_text:
                    continue
                lines = sec_text.splitlines()
                title = lines[0].lstrip('#').strip() if lines else f"Section {i+1}"
                chunk_id = f"{doc_name} - {title}"
                total_chunks.append(DocumentChunk(doc_name, title, sec_text, chunk_id))

        self.chunks = total_chunks
        self._calculate_idf()
        self.is_indexed = len(self.chunks) > 0
        print(f"[RAG] Successfully indexed {len(self.chunks)} knowledge chunks from {len(doc_files)} agricultural documents.")

    def _calculate_idf(self):
        doc_count = len(self.chunks)
        if doc_count == 0:
            return

        df = {}
        for chunk in self.chunks:
            for word in chunk.word_counts:
                df[word] = df.get(word, 0) + 1

        self.idf = {word: math.log((doc_count + 1) / (count + 1)) + 1 for word, count in df.items()}

    def retrieve(self, query: str, top_k: int = 3, threshold: float = 0.12) -> List[Dict]:
        """
        Calculates TF-IDF cosine similarity between the query and chunk vectors.
        Returns top matching chunks with citations.
        """
        if not self.is_indexed or not self.chunks:
            return []

        query_words = re.findall(r'\b[a-zA-Z]{3,}\b', query.lower())
        if not query_words:
            return []

        # Build query vector
        query_counts = {}
        for w in query_words:
            query_counts[w] = query_counts.get(w, 0) + 1

        query_vec = {w: count * self.idf.get(w, 1.0) for w, count in query_counts.items()}
        query_mag = math.sqrt(sum(v * v for v in query_vec.values()))
        if query_mag == 0:
            return []

        scores = []
        for chunk in self.chunks:
            dot = 0.0
            chunk_vec = {}
            for w, count in chunk.word_counts.items():
                tfidf = count * self.idf.get(w, 1.0)
                chunk_vec[w] = tfidf
                if w in query_vec:
                    dot += tfidf * query_vec[w]

            chunk_mag = math.sqrt(sum(v * v for v in chunk_vec.values()))
            if chunk_mag > 0:
                sim = dot / (query_mag * chunk_mag)
                if sim >= threshold:
                    scores.append((sim, chunk))

        scores.sort(key=lambda x: x[0], reverse=True)
        top_matches = scores[:top_k]

        results = []
        for sim, chunk in top_matches:
            results.append({
                "citation": f"[{chunk.doc_name} - {chunk.section}]",
                "document": chunk.doc_name,
                "section": chunk.section,
                "relevance_score": round(sim, 3),
                "text": chunk.text
            })

        return results

# Global RAG singleton
rag_engine = AgriculturalRAG()
