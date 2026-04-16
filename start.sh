#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

echo ""
echo -e "${BOLD}${BLUE}╔══════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${BLUE}║        MedTrace — Clinical AI Platform        ║${NC}"
echo -e "${BOLD}${BLUE}╚══════════════════════════════════════════╝${NC}"
echo ""

# Check Python
if ! command -v python3 &>/dev/null; then
    echo -e "${RED}ERROR: python3 not found${NC}"
    exit 1
fi

# Install Python deps
echo -e "${CYAN}[1/5]${NC} Installing Python dependencies..."
pip install -r requirements.txt -q

# Check indexes
echo -e "${CYAN}[2/5]${NC} Checking indexes..."

INDEXES_READY=true

if [ ! -f "indexes/icd10_faiss.index" ]; then
    echo -e "${YELLOW}  ⚠ ICD-10 FAISS index not found${NC}"
    INDEXES_READY=false
fi

if [ ! -f "indexes/patient_faiss.index" ]; then
    echo -e "${YELLOW}  ⚠ Patient FAISS index not found${NC}"
    INDEXES_READY=false
fi

if [ ! -f "indexes/bm25_index.pkl" ]; then
    echo -e "${YELLOW}  ⚠ BM25 index not found${NC}"
    INDEXES_READY=false
fi

if [ "$INDEXES_READY" = false ]; then
    echo ""
    echo -e "${YELLOW}╔══════════════════════════════════════════════════════╗${NC}"
    echo -e "${YELLOW}║  INDEX BUILD REQUIRED                                ║${NC}"
    echo -e "${YELLOW}║                                                      ║${NC}"
    echo -e "${YELLOW}║  You need to build the indexes before starting.      ║${NC}"
    echo -e "${YELLOW}║  Make sure LM Studio is running with:                ║${NC}"
    echo -e "${YELLOW}║    - nomic-embed-text-v1.5 loaded                    ║${NC}"
    echo -e "${YELLOW}║    - qwen2.5-3b-instruct loaded                      ║${NC}"
    echo -e "${YELLOW}║                                                      ║${NC}"
    echo -e "${YELLOW}║  Then run:                                           ║${NC}"
    echo -e "${YELLOW}║    python3 scripts/build_icd10_index.py              ║${NC}"
    echo -e "${YELLOW}║    python3 scripts/build_patient_index.py            ║${NC}"
    echo -e "${YELLOW}╚══════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "Start anyway (indexes will be empty)? [y/N] "
    read -r answer
    if [ "$answer" != "y" ] && [ "$answer" != "Y" ]; then
        exit 1
    fi
else
    echo -e "${GREEN}  ✓ All indexes found${NC}"
fi

# Frontend build check
echo -e "${CYAN}[3/5]${NC} Checking frontend..."
if [ ! -d "frontend/node_modules" ]; then
    echo -e "  Installing npm dependencies..."
    cd frontend && npm install --legacy-peer-deps && cd ..
fi
echo -e "${GREEN}  ✓ Frontend ready${NC}"

# Start backend
echo -e "${CYAN}[4/5]${NC} Starting FastAPI backend on port 8000..."
cd "$SCRIPT_DIR"
PYTHONPATH="$SCRIPT_DIR" python3 -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
echo -e "${GREEN}  ✓ Backend started (PID $BACKEND_PID)${NC}"

# Wait for backend to be ready
echo -e "  Waiting for backend..."
for i in $(seq 1 15); do
    if curl -s http://localhost:8000/api/health >/dev/null 2>&1; then
        echo -e "${GREEN}  ✓ Backend is healthy${NC}"
        break
    fi
    sleep 1
done

# Start frontend
echo -e "${CYAN}[5/5]${NC} Starting React frontend on port 3000..."
cd "$SCRIPT_DIR/frontend"
BROWSER=none npm start &
FRONTEND_PID=$!
echo -e "${GREEN}  ✓ Frontend started (PID $FRONTEND_PID)${NC}"

echo ""
echo -e "${BOLD}${GREEN}╔════════════════════════════════════╗${NC}"
echo -e "${BOLD}${GREEN}║  MedTrace is running!               ║${NC}"
echo -e "${BOLD}${GREEN}║                                     ║${NC}"
echo -e "${BOLD}${GREEN}║  Frontend:  http://localhost:3000   ║${NC}"
echo -e "${BOLD}${GREEN}║  Backend:   http://localhost:8000   ║${NC}"
echo -e "${BOLD}${GREEN}║  API Docs:  http://localhost:8000/docs ║${NC}"
echo -e "${BOLD}${GREEN}╚════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}Press Ctrl+C to stop all services${NC}"

# Cleanup on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}Shutting down...${NC}"
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    echo -e "${GREEN}Done.${NC}"
}
trap cleanup INT TERM

wait
