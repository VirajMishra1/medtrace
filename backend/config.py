from __future__ import annotations
"""
MedTrace Configuration
All hyperparameters and service URLs in one place.
"""
from pathlib import Path

# === LM Studio ===
LMSTUDIO_BASE_URL = "http://localhost:1234/v1"
LMSTUDIO_API_KEY = "lm-studio"
LLM_MODEL = "qwen2.5-3b-instruct"
EMBED_MODEL = "text-embedding-nomic-embed-text-v1.5"
EMBED_DIM = 768

LLM_MAX_TOKENS = 1024
LLM_TEMPERATURE = 0.3
LLM_TIMEOUT = 60.0  # seconds

# === Paths ===
BASE_DIR = Path(__file__).parent.parent
INDEX_DIR = BASE_DIR / "indexes"
DATA_DIR = BASE_DIR / "data"

PATIENT_FAISS_PATH = INDEX_DIR / "patient_faiss.index"
PATIENT_METADATA_PATH = INDEX_DIR / "patient_metadata.json"
PATIENT_PARQUET_PATH = INDEX_DIR / "patients_subset.parquet"
BM25_INDEX_PATH = INDEX_DIR / "bm25_index.pkl"
BM25_CORPUS_PATH = INDEX_DIR / "bm25_corpus.pkl"

ICD10_FAISS_PATH = INDEX_DIR / "icd10_faiss.index"
ICD10_MAPPING_PATH = INDEX_DIR / "icd10_mapping.json"

# === Retrieval Hyperparameters ===
DEFAULT_TOP_K_PATIENTS = 10
DEFAULT_TOP_K_ICD10 = 15
BM25_TOP_K = 50          # Candidates from BM25 before RRF fusion
DENSE_TOP_K = 50         # Candidates from FAISS before RRF fusion
RRF_K = 60               # Reciprocal rank fusion constant
NOTE_EMBED_TRUNCATE = 1500  # chars to truncate patient note before embedding
