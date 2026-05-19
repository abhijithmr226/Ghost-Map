#!/usr/bin/env bash
# ============================================================
#  GhostMap Auto-Installer  —  Linux / macOS
#  Usage:  curl -fsSL https://raw.githubusercontent.com/YOU/ghostmap/main/install.sh | bash
#          OR: bash install.sh
# ============================================================
set -e

RED='\033[0;31m'; GREEN='\033[0;32m'; CYAN='\033[0;36m'
YELLOW='\033[1;33m'; BOLD='\033[1m'; NC='\033[0m'

banner() { echo -e "\n${CYAN}${BOLD}$1${NC}"; }
ok()     { echo -e "  ${GREEN}✓${NC} $1"; }
warn()   { echo -e "  ${YELLOW}⚠${NC} $1"; }
fail()   { echo -e "  ${RED}✗${NC} $1"; exit 1; }

echo -e "${CYAN}"
echo "  ██████╗ ██╗  ██╗ ██████╗ ███████╗████████╗███╗   ███╗ █████╗ ██████╗ "
echo "  ██╔════╝██║  ██║██╔═══██╗██╔════╝╚══██╔══╝████╗ ████║██╔══██╗██╔══██╗"
echo "  ██║  ███╗███████║██║   ██║███████╗   ██║   ██╔████╔██║███████║██████╔╝"
echo "  ██║   ██║██╔══██║██║   ██║╚════██║   ██║   ██║╚██╔╝██║██╔══██║██╔═══╝ "
echo "  ╚██████╔╝██║  ██║╚██████╔╝███████║   ██║   ██║ ╚═╝ ██║██║  ██║██║     "
echo "   ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚══════╝   ╚═╝   ╚═╝     ╚═╝╚═╝  ╚═╝╚═╝     "
echo -e "${NC}"
echo -e "  ${BOLD}Visual Network Recon Dashboard${NC}  —  Auto Installer"
echo "  ──────────────────────────────────────────────────────"

INSTALL_DIR="${GHOSTMAP_DIR:-$HOME/ghostmap}"
REPO_URL="https://github.com/YOU/ghostmap"   # change to your repo

# ── 1. Detect OS ──────────────────────────────────────────────
banner "Detecting system..."
OS="$(uname -s)"
DISTRO=""
PKG_MGR=""

if [ "$OS" = "Linux" ]; then
  if   command -v apt-get &>/dev/null; then PKG_MGR="apt";    DISTRO="debian"
  elif command -v dnf     &>/dev/null; then PKG_MGR="dnf";    DISTRO="fedora"
  elif command -v yum     &>/dev/null; then PKG_MGR="yum";    DISTRO="rhel"
  elif command -v pacman  &>/dev/null; then PKG_MGR="pacman"; DISTRO="arch"
  elif command -v zypper  &>/dev/null; then PKG_MGR="zypper"; DISTRO="suse"
  else fail "Unsupported Linux distro — install Node.js and nmap manually."
  fi
  ok "Linux ($DISTRO) detected"
elif [ "$OS" = "Darwin" ]; then
  PKG_MGR="brew"
  ok "macOS detected"
else
  fail "Unsupported OS: $OS"
fi

# ── 2. Install nmap ───────────────────────────────────────────
banner "Installing nmap..."
if command -v nmap &>/dev/null; then
  ok "nmap already installed: $(nmap --version | head -1)"
else
  case "$PKG_MGR" in
    apt)    sudo apt-get update -qq && sudo apt-get install -y nmap ;;
    dnf)    sudo dnf install -y nmap ;;
    yum)    sudo yum install -y nmap ;;
    pacman) sudo pacman -Sy --noconfirm nmap ;;
    zypper) sudo zypper install -y nmap ;;
    brew)   brew install nmap ;;
  esac
  ok "nmap installed: $(nmap --version | head -1)"
fi

# ── 3. Install Node.js ────────────────────────────────────────
banner "Installing Node.js..."
if command -v node &>/dev/null && [ "$(node -e 'process.exit(parseInt(process.version.slice(1)) < 18 ? 1 : 0)' ; echo $?)" = "0" ]; then
  ok "Node.js already installed: $(node --version)"
else
  warn "Node.js 18+ not found — installing via NodeSource..."
  if [ "$PKG_MGR" = "brew" ]; then
    brew install node@20
  elif [ "$PKG_MGR" = "pacman" ]; then
    sudo pacman -Sy --noconfirm nodejs npm
  else
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - 2>/dev/null || \
    curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo -E bash - 2>/dev/null || \
    fail "Could not install Node.js automatically. Visit https://nodejs.org"
    case "$PKG_MGR" in
      apt) sudo apt-get install -y nodejs ;;
      dnf) sudo dnf install -y nodejs ;;
      yum) sudo yum install -y nodejs ;;
    esac
  fi
  ok "Node.js installed: $(node --version)"
fi

# ── 4. Clone / update repo ────────────────────────────────────
banner "Setting up GhostMap..."
if [ -d "$INSTALL_DIR/.git" ]; then
  warn "Existing installation found at $INSTALL_DIR — updating..."
  cd "$INSTALL_DIR"
  git pull --ff-only
  ok "Updated to latest"
else
  if command -v git &>/dev/null; then
    git clone "$REPO_URL" "$INSTALL_DIR"
  else
    warn "git not found — downloading zip..."
    case "$PKG_MGR" in
      apt)    sudo apt-get install -y git ;;
      dnf)    sudo dnf install -y git ;;
      yum)    sudo yum install -y git ;;
      pacman) sudo pacman -Sy --noconfirm git ;;
      brew)   brew install git ;;
    esac
    git clone "$REPO_URL" "$INSTALL_DIR"
  fi
  ok "Cloned to $INSTALL_DIR"
fi
cd "$INSTALL_DIR"

# ── 5. Install dependencies ───────────────────────────────────
banner "Installing dependencies..."
cd server && npm install --silent && ok "Server deps installed" && cd ..
cd client && npm install --silent && ok "Client deps installed" && cd ..

# ── 6. Build frontend ─────────────────────────────────────────
banner "Building frontend..."
cd client && npm run build --silent && ok "Frontend built" && cd ..

# ── 7. Create launcher script ─────────────────────────────────
banner "Creating launcher..."
cat > "$INSTALL_DIR/start.sh" << 'EOF'
#!/usr/bin/env bash
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo "[GhostMap] Starting backend..."
node "$DIR/server/server.js" &
SERVER_PID=$!
echo "[GhostMap] Backend PID: $SERVER_PID"
sleep 1
echo "[GhostMap] Starting frontend dev server..."
cd "$DIR/client" && npm run dev &
VITE_PID=$!
echo "[GhostMap] Open http://localhost:5173"
trap "kill $SERVER_PID $VITE_PID 2>/dev/null" EXIT
wait
EOF
chmod +x "$INSTALL_DIR/start.sh"
ok "Launcher created: $INSTALL_DIR/start.sh"

# ── 8. Optional: systemd service ─────────────────────────────
if command -v systemctl &>/dev/null && [ "$OS" = "Linux" ]; then
  read -p "  Install as systemd service? (auto-start on boot) [y/N]: " yn
  if [ "${yn,,}" = "y" ]; then
    sudo tee /etc/systemd/system/ghostmap.service > /dev/null << SVCEOF
[Unit]
Description=GhostMap Network Recon Dashboard
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$INSTALL_DIR/server
ExecStart=$(which node) server.js
Restart=on-failure
RestartSec=5
Environment=PORT=5000

[Install]
WantedBy=multi-user.target
SVCEOF
    sudo systemctl daemon-reload
    sudo systemctl enable ghostmap
    sudo systemctl start ghostmap
    ok "systemd service installed & started"
  fi
fi

echo ""
echo -e "  ${GREEN}${BOLD}✅ GhostMap installed successfully!${NC}"
echo ""
echo -e "  Run:  ${CYAN}bash $INSTALL_DIR/start.sh${NC}"
echo -e "  Open: ${CYAN}http://localhost:5173${NC}"
echo ""
