#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# SmartFlow Nexus — One-command startup script
# Usage: bash start.sh
# ─────────────────────────────────────────────────────────────────────────────

set -e

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

echo -e "${CYAN}${BOLD}"
echo "  ███████╗███╗   ███╗ █████╗ ██████╗ ████████╗"
echo "  ██╔════╝████╗ ████║██╔══██╗██╔══██╗╚══██╔══╝"
echo "  ███████╗██╔████╔██║███████║██████╔╝   ██║   "
echo "  ╚════██║██║╚██╔╝██║██╔══██║██╔══██╗   ██║   "
echo "  ███████║██║ ╚═╝ ██║██║  ██║██║  ██║   ██║   "
echo "  ╚══════╝╚═╝     ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝  "
echo "  ███████╗██╗      ██████╗ ██╗    ██╗           "
echo "  ██╔════╝██║     ██╔═══██╗██║    ██║           "
echo "  █████╗  ██║     ██║   ██║██║ █╗ ██║           "
echo "  ██╔══╝  ██║     ██║   ██║██║███╗██║           "
echo "  ██║     ███████╗╚██████╔╝╚███╔███╔╝           "
echo "  ╚═╝     ╚══════╝ ╚═════╝  ╚══╝╚══╝   NEXUS   "
echo -e "${RESET}"
echo -e "${BOLD}  AI Traffic Management System — Unified Startup${RESET}"
echo -e "  ─────────────────────────────────────────────"

# ── Check .env files ──────────────────────────────────────────────────────────
if [ ! -f frontend/.env.local ]; then
  echo -e "\n${YELLOW}⚠  frontend/.env.local not found.${RESET}"
  echo -e "   Copying from .env.local.example..."
  cp frontend/.env.local.example frontend/.env.local
  echo -e "   ${RED}→ Edit frontend/.env.local and add your GOOGLE_MAPS and GEMINI keys!${RESET}"
fi

if [ ! -f backend/.env ]; then
  echo -e "\n${YELLOW}⚠  backend/.env not found.${RESET}"
  echo -e "   Copying from .env.example..."
  cp backend/.env.example backend/.env
  echo -e "   ${YELLOW}→ Edit backend/.env to add OPENAI_API_KEY (optional for demo mode)${RESET}"
fi

# ── Install frontend deps ─────────────────────────────────────────────────────
echo -e "\n${GREEN}▶ Installing frontend dependencies...${RESET}"
cd frontend
if [ ! -d node_modules ]; then
  npm install --legacy-peer-deps
else
  echo -e "  (node_modules already present, skipping)"
fi
cd ..

# ── Install backend deps ──────────────────────────────────────────────────────
echo -e "\n${GREEN}▶ Installing backend dependencies...${RESET}"
cd backend
if command -v uv &> /dev/null; then
  uv pip install -r requirements.txt 2>/dev/null || \
  pip install -r requirements.txt
else
  pip install -r requirements.txt
fi
cd ..

# ── Start backend in background ───────────────────────────────────────────────
echo -e "\n${GREEN}▶ Starting FastAPI backend on http://localhost:8000 ...${RESET}"
cd backend
python api.py &
BACKEND_PID=$!
cd ..
echo -e "  Backend PID: $BACKEND_PID"

# Wait for backend to be ready
echo -e "  Waiting for backend to be ready..."
for i in {1..15}; do
  if curl -s http://localhost:8000/api/health > /dev/null 2>&1; then
    echo -e "  ${GREEN}✓ Backend is up!${RESET}"
    break
  fi
  sleep 1
done

# ── Start frontend ────────────────────────────────────────────────────────────
echo -e "\n${GREEN}▶ Starting Next.js frontend on http://localhost:9002 ...${RESET}"
echo -e "\n${BOLD}─────────────────────────────────────────────────────${RESET}"
echo -e "${BOLD}  SmartFlow Nexus is running!${RESET}"
echo -e ""
echo -e "  🌐 Frontend:  ${CYAN}http://localhost:9002${RESET}"
echo -e "  🔌 Backend:   ${CYAN}http://localhost:8000${RESET}"
echo -e "  📚 API Docs:  ${CYAN}http://localhost:8000/docs${RESET}"
echo -e ""
echo -e "  Demo Accounts:"
echo -e "  👤 Admin:     admin@smartflow.com    / admin123"
echo -e "  👤 User:      user@smartflow.com     / user123"
echo -e "  🚑 Emergency: ambulance@smartflow.com / emerg123"
echo -e ""
echo -e "  Free keys (frontend/.env.local):"
echo -e "  🔑 Gemini: https://aistudio.google.com/app/apikey (free)"
echo -e "  🔑 ORS:    https://openrouteservice.org/dev (free, optional)"
echo -e "${BOLD}─────────────────────────────────────────────────────${RESET}\n"
echo -e "  Press ${RED}Ctrl+C${RESET} to stop both services.\n"

# Cleanup on exit
cleanup() {
  echo -e "\n${YELLOW}Stopping services...${RESET}"
  kill $BACKEND_PID 2>/dev/null || true
  exit 0
}
trap cleanup INT TERM

cd frontend
npm run dev
