from __future__ import annotations
"""
MedTrace FastAPI Application
Clinical Decision Support System powered by PMC-Patients + LM Studio
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from backend.services import retriever, icd10_mapper
from backend.routers import analyze, patients, health


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: load indexes
    print("[medtrace] Loading indexes...")
    retriever.load_indexes()
    icd10_mapper.load_icd10_index()
    print("[medtrace] Ready.")
    yield
    # Shutdown
    print("[medtrace] Shutting down.")


app = FastAPI(
    title="MedTrace",
    description="Clinical Decision Support — PMC-Patients × ICD-10 × Local LLM",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analyze.router, prefix="/api")
app.include_router(patients.router, prefix="/api")
app.include_router(health.router, prefix="/api")


@app.get("/")
async def root():
    return {"service": "MedTrace", "version": "1.0.0", "docs": "/docs"}
