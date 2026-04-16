"""
Phase 2a: Build ICD-10 FAISS Index
Re-embeds top N ICD-10 descriptions with nomic-embed-text for cross-model consistency.
Saves FAISS index + mapping JSON.
"""
import pandas as pd
import numpy as np
import faiss
import json
import pickle
import openai
from pathlib import Path
from tqdm import tqdm
import time

DATA_DIR = Path(__file__).parent.parent / "data"
INDEX_DIR = Path(__file__).parent.parent / "indexes"
INDEX_DIR.mkdir(exist_ok=True)

# Config
LMSTUDIO_URL = "http://localhost:1234/v1"
EMBED_MODEL = "text-embedding-nomic-embed-text-v1.5"
EMBED_DIM = 768
N_CODES = 10000      # Re-embed top N ICD-10 codes with nomic-embed-text
BATCH_SIZE = 32

client = openai.OpenAI(base_url=LMSTUDIO_URL, api_key="lm-studio")


def embed_texts(texts: list[str]) -> np.ndarray:
    """Embed a list of texts using nomic-embed-text via LM Studio."""
    all_vecs = []
    for i in tqdm(range(0, len(texts), BATCH_SIZE), desc="Embedding ICD-10"):
        batch = texts[i:i + BATCH_SIZE]
        for attempt in range(3):
            try:
                resp = client.embeddings.create(model=EMBED_MODEL, input=batch)
                vecs = [d.embedding for d in resp.data]
                all_vecs.extend(vecs)
                break
            except Exception as e:
                print(f"Batch {i} attempt {attempt+1} failed: {e}")
                time.sleep(2)
        else:
            # Fallback: zero vectors
            all_vecs.extend([[0.0] * EMBED_DIM] * len(batch))
    return np.array(all_vecs, dtype=np.float32)


def build_icd10_index():
    print("Loading ICD-10 codes...")
    df = pd.read_csv(DATA_DIR / "icd_10_codes.csv", usecols=["icd_10_code", "description"])
    print(f"Total ICD-10 codes: {len(df)}")

    # Take first N_CODES (they're already somewhat ordered/common)
    # Deduplicate first
    df = df.drop_duplicates(subset=["icd_10_code"]).reset_index(drop=True)
    print(f"After dedup: {len(df)}")

    df_subset = df.head(N_CODES).copy()
    print(f"Using top {len(df_subset)} codes for re-embedding")

    texts = df_subset["description"].fillna("unknown").tolist()

    print(f"\nRe-embedding {len(texts)} ICD-10 descriptions with {EMBED_MODEL}...")
    print("(This may take ~10-15 minutes depending on LM Studio speed)")
    vectors = embed_texts(texts)
    print(f"Embedded shape: {vectors.shape}")

    # Normalize for cosine similarity via inner product
    norms = np.linalg.norm(vectors, axis=1, keepdims=True)
    norms = np.where(norms == 0, 1, norms)
    vectors_norm = vectors / norms

    # Build FAISS index
    print("Building FAISS index...")
    index = faiss.IndexFlatIP(EMBED_DIM)
    index.add(vectors_norm)
    print(f"FAISS index size: {index.ntotal}")

    # Save index
    faiss.write_index(index, str(INDEX_DIR / "icd10_faiss.index"))
    print(f"Saved icd10_faiss.index")

    # Save mapping: idx → {code, description}
    mapping = {}
    for i, row in df_subset.iterrows():
        mapping[i] = {"code": row["icd_10_code"], "description": row["description"]}

    with open(INDEX_DIR / "icd10_mapping.json", "w") as f:
        json.dump(mapping, f)
    print(f"Saved icd10_mapping.json ({len(mapping)} entries)")

    print("\nICD-10 index build complete!")
    return index, mapping


if __name__ == "__main__":
    build_icd10_index()
