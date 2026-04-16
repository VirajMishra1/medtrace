"""
Phase 2b: Build Patient FAISS + BM25 Indexes
Subsamples ~15K patients from PMC_Patients_clean.csv,
embeds with nomic-embed-text, builds FAISS + BM25 indexes.
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
N_PATIENTS = 15000
BATCH_SIZE = 32
SEED = 42
NOTE_TRUNCATE = 512  # chars to use for embedding (first ~512 chars of note)

client = openai.OpenAI(base_url=LMSTUDIO_URL, api_key="lm-studio")


def embed_texts(texts: list[str]) -> np.ndarray:
    """Embed a list of texts using nomic-embed-text via LM Studio."""
    all_vecs = []
    for i in tqdm(range(0, len(texts), BATCH_SIZE), desc="Embedding patients"):
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
            all_vecs.extend([[0.0] * EMBED_DIM] * len(batch))
    return np.array(all_vecs, dtype=np.float32)


def build_patient_index():
    print("Loading PMC_Patients_clean.csv...")
    df = pd.read_csv(DATA_DIR / "PMC_Patients_clean.csv")
    print(f"Total patients: {len(df)}")

    # Subsample
    df_sub = df.sample(n=min(N_PATIENTS, len(df)), random_state=SEED).reset_index(drop=True)
    print(f"Subsampled: {len(df_sub)} patients")

    # Save subset as parquet
    df_sub.to_parquet(INDEX_DIR / "patients_subset.parquet", index=False)
    print("Saved patients_subset.parquet")

    # Prepare texts for embedding (truncate for speed)
    texts = df_sub["patient_note"].fillna("").str[:NOTE_TRUNCATE].tolist()

    print(f"\nEmbedding {len(texts)} patient notes with {EMBED_MODEL}...")
    print("Estimated time: ~15-25 mins at 10 notes/sec on M3 Pro")
    t0 = time.time()
    vectors = embed_texts(texts)
    elapsed = time.time() - t0
    print(f"Embedding done in {elapsed/60:.1f} minutes ({elapsed/len(texts):.2f} sec/note)")
    print(f"Vectors shape: {vectors.shape}")

    # Save raw vectors for inspection
    np.save(str(INDEX_DIR / "patient_vectors.npy"), vectors)

    # Normalize for cosine sim via inner product
    norms = np.linalg.norm(vectors, axis=1, keepdims=True)
    norms = np.where(norms == 0, 1, norms)
    vectors_norm = (vectors / norms).astype(np.float32)

    # Build FAISS
    print("Building FAISS index...")
    index = faiss.IndexFlatIP(EMBED_DIM)
    index.add(vectors_norm)
    faiss.write_index(index, str(INDEX_DIR / "patient_faiss.index"))
    print(f"Saved patient_faiss.index ({index.ntotal} vectors)")

    # Build metadata JSON
    metadata = []
    for _, row in df_sub.iterrows():
        note = str(row.get("patient_note", ""))
        metadata.append({
            "patient_uid": str(row["patient_uid"]),
            "age": int(row["age"]) if pd.notna(row.get("age")) else None,
            "gender": str(row.get("gender", "")),
            "snippet": note[:300],
            "full_note": note
        })
    with open(INDEX_DIR / "patient_metadata.json", "w") as f:
        json.dump(metadata, f)
    print(f"Saved patient_metadata.json ({len(metadata)} entries)")

    # Build BM25 index
    print("\nBuilding BM25 index...")
    from rank_bm25 import BM25Okapi
    tokenized = [note.lower().split() for note in df_sub["patient_note"].fillna("").tolist()]
    bm25 = BM25Okapi(tokenized)
    with open(INDEX_DIR / "bm25_index.pkl", "wb") as f:
        pickle.dump(bm25, f)
    print("Saved bm25_index.pkl")

    # Save tokenized corpus for BM25 (needed for later retrieval)
    with open(INDEX_DIR / "bm25_corpus.pkl", "wb") as f:
        pickle.dump(tokenized, f)
    print("Saved bm25_corpus.pkl")

    print("\nPatient index build complete!")


if __name__ == "__main__":
    build_patient_index()
