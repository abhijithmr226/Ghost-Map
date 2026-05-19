#!/usr/bin/env bash
# ============================================================
#  GhostMap — One-Click Install & Run
#  Linux / macOS
#
#  Usage:
#    curl -fsSL https://raw.githubusercontent.com/YOU/ghostmap/main/ghostmap.sh | bash
#    — OR —
#    bash ghostmap.sh
# ============================================================
set -e
CYAN='\033[0;36m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
RED='\033[0;31m'; BOLD='\033[1m'; NC='\033[0m'

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" 2>/dev/null && pwd)"

echo -e "${CYAN}${BOLD}"
echo "  ██████╗ ██╗  ██╗ ██████╗ ███████╗████████╗███╗   ███╗ █████╗ ██████╗ "
echo "  ██║ ╔══╝██║  ██║██╔═══██╗██╔════╝╚══██╔══╝████╗ ████║██╔══██╗██╔══██╗"
echo "  ██║  ███╗███████║██║   ██║███████╗   ██║   ██╔████╔██║███████║██████╔╝"
echo "  ██║   ██║██╔══██║██║   ██║╚════██║   ██║   ██║╚██╔╝██║██╔══██║██╔═══╝ "
echo "  ╚██████╔╝██║  ██║╚██████╔╝███████║   ██║   ██║ ╚═╝ ██║██║  ██║██║     "
echo "   ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚══════╝   ╚═╝   ╚═╝     ╚═╝╚═╝  ╚═╝╚═╝     "
echo -e "${NC}"
echo -e "  ${BOLD}One-Click Install & Run${NC}"
echo "  ───────────────────────────────────────────────────"

step() { echo -e "\n${CYAN}[${1}]${NC} $2"; }
ok()   { echo -e "     ${GREEN}✓${NC} $1"; }
warn() { echo -e "     ${YELLOW}⚠${NC} $1"; }
fail() { echo -e "     ${RED}✗${NC} $1"; exit 1; }

# ── Detect package manager ───────────────────────────────────
OS="$(uname -s)"
PKG=""
if   command -v apt-get &>/dev/null; then PKG="apt"
elif command -v dnf     &>/dev/null; then PKG="dnf"
elif command -v yum     &>/dev/null; then PKG="yum"
elif command -v pacman  &>/dev/null; then PKG="pacman"
elif command -v zypper  &>/dev/null; then PKG="zypper"
elif command -v brew    &>/dev/null; then PKG="brew"
fi

pkg_install() {
  case "$PKG" in
    apt)    sudo apt-get install -y -qq "$@" ;;
    dnf)    sudo dnf install -y -q "$@" ;;
    yum)    sudo yum install -y -q "$@" ;;
    pacman) sudo pacman -Sy --noconfirm "$@" ;;
    zypper) sudo zypper install -y "$@" ;;
    brew)   brew install "$@" ;;
    *)      fail "No package manager found. Install $* manually." ;;
  esac
}

# ── 1. nmap ──────────────────────────────────────────────────
step "1/4" "Checking nmap..."
if command -v nmap &>/dev/null; then
  ok "nmap $(nmap --version | head -1)"
else
  warn "Installing nmap..."
  pkg_install nmap
  ok "nmap installed"
fi

# ── 2. Node.js ───────────────────────────────────────────────
step "2/4" "Checking Node.js..."
NODE_OK=false
if command -v node &>/dev/null; then
  NODE_VER=$(node -e 'process.exit(parseInt(process.version.slice(1)) < 18 ? 1 : 0)' && echo ok || echo old)
  if [ "$NODE_VER" = "ok" ]; then NODE_OK=true; ok "Node.js $(node --version)"; fi
fi

if [ "$NODE_OK" = "false" ]; then
  warn "Installing Node.js 20 LTS..."
  if [ "$PKG" = "brew" ]; then
    brew install node@20
  elif [ "$PKG" = "pacman" ]; then
    pkg_install nodejs npm
  else
    curl -fsSL https://deb.nodesource.com/setup_20.x 2>/dev/null | sudo -E bash - 2>/dev/null || \
    curl -fsSL https://rpm.nodesource.com/setup_20.x 2>/dev/null | sudo -E bash - 2>/dev/null || \
    fail "Could not install Node.js. Visit https://nodejs.org"
    pkg_install nodejs
  fi
  ok "Node.js $(node --version)"
fi

# ── 3. Dependencies ──────────────────────────────────────────
step "3/4" "Installing npm dependencies..."

if [ ! -d "$ROOT/server/node_modules" ]; then
  (cd "$ROOT/server" && npm install --silent)
fi
ok "Server deps ready"

if [ ! -d "$ROOT/client/node_modules" ]; then
  (cd "$ROOT/client" && npm install --silent)
fi
ok "Client deps ready"

# ── 4. Launch ────────────────────────────────────────────────
step "4/4" "Launching GhostMap..."

# Kill any existing instances
pkill -f "node server.js" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
sleep 1

# Start backend
node "$ROOT/server/server.js" &
SERVER_PID=$!
ok "Backend started (PID $SERVER_PID)"
sleep 1

# Start frontend
(cd "$ROOT/client" && npm run dev) &
VITE_PID=$!
ok "Frontend started (PID $VITE_PID)"
sleep 2

# Open browser
URL="http://localhost:5173"
if command -v xdg-open &>/dev/null; then
  xdg-open "$URL" 2>/dev/null &
elif command -v open &>/dev/null; then
  open "$URL"
fi

echo ""
echo -e "  ${GREEN}${BOLD}✅ GhostMap is running!${NC}"
echo -e "  Dashboard: ${CYAN}$URL${NC}"
echo -e "  API:       ${CYAN}http://localhost:5000${NC}"
echo ""
echo "  Press Ctrl+C to stop GhostMap"
echo ""

# Trap SIGINT to cleanly stop both processes
trap "echo ''; echo 'Stopping GhostMap...'; kill $SERVER_PID $VITE_PID 2>/dev/null; exit 0" SIGINT SIGTERM

wait $SERVER_PID $VITE_PID
