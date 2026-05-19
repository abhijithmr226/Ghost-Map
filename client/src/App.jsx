import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import StatCard    from "./components/StatCard";
import HostList    from "./components/HostList";
import TopologyMap from "./components/TopologyMap";
import ScanLog     from "./components/ScanLog";
import SavedTargets from "./components/SavedTargets";
import { exportJSON, exportPDF } from "./utils/exportUtils";
import {
  Radar, Wifi, Shield, AlertTriangle,
  Server, Activity, Play, StopCircle,
  List, Globe, Settings, Eye, Terminal,
  AlertCircle, CheckCircle2, XCircle, RefreshCw, Download,
  FileJson, FileText
} from "lucide-react";

// ── Update Panel ─────────────────────────────────────────────────────────────
function UpdatePanel({ onClose }) {
  const [status,  setStatus]  = useState("idle"); // idle | running | done | error
  const [steps,   setSteps]   = useState([]);
  const [message, setMessage] = useState("");
  const [version, setVersion] = useState(null);

  useEffect(() => {
    axios.get("/api/version").then(r => setVersion(r.data)).catch(() => {});
  }, []);

  const runUpdate = async () => {
    setStatus("running"); setSteps([]); setMessage("");
    try {
      const res = await axios.post("/api/update", {}, { timeout: 180_000 });
      setSteps(res.data.steps || []);
      setMessage(res.data.message);
      setStatus(res.data.success ? "done" : "error");
    } catch (err) {
      setMessage(err.response?.data?.error || err.message);
      setStatus("error");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      style={{
        position: "absolute", top: 70, right: 24, width: 420, zIndex: 200,
        background: "rgba(2,11,24,0.97)",
        border: "1px solid rgba(0,245,255,0.18)",
        borderRadius: 14, padding: 20,
        boxShadow: "0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,245,255,0.05)",
        backdropFilter: "blur(20px)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Download size={15} color="#00f5ff" />
          <span style={{ fontFamily: "Orbitron, sans-serif", fontSize: 11, letterSpacing: "0.12em", color: "#00f5ff" }}>UPDATE GHOSTMAP</span>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(180,210,240,0.4)", cursor: "pointer", fontSize: 16 }}>✕</button>
      </div>

      {version && (
        <div style={{ marginBottom: 14, padding: "8px 12px", background: "rgba(0,245,255,0.05)", borderRadius: 8, fontFamily: "JetBrains Mono, monospace", fontSize: 11 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
            <span style={{ color: "rgba(180,210,240,0.5)" }}>VERSION</span>
            <span style={{ color: "#00f5ff" }}>{version.version || "local"}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
            <span style={{ color: "rgba(180,210,240,0.5)" }}>PLATFORM</span>
            <span style={{ color: "#a855f7" }}>{version.platform}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "rgba(180,210,240,0.5)" }}>NODE</span>
            <span style={{ color: "rgba(180,210,240,0.7)" }}>{version.nodeVersion}</span>
          </div>
        </div>
      )}

      <p style={{ fontSize: 12, color: "rgba(180,210,240,0.55)", marginBottom: 14, lineHeight: 1.5 }}>
        Pulls the latest code from git and reinstalls dependencies. Requires git to be installed.
      </p>

      {steps.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          {steps.map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8, padding: "8px 10px", background: "rgba(0,0,0,0.3)", borderRadius: 8 }}>
              {s.ok
                ? <CheckCircle2 size={13} color="#00ff88" style={{ marginTop: 1, flexShrink: 0 }} />
                : <XCircle     size={13} color="#ff3366" style={{ marginTop: 1, flexShrink: 0 }} />}
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: "Orbitron, sans-serif", fontSize: 10, color: s.ok ? "#00ff88" : "#ff3366", letterSpacing: "0.08em" }}>{s.step}</div>
                {s.out && <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: "rgba(180,210,240,0.45)", marginTop: 3, wordBreak: "break-all", whiteSpace: "pre-wrap", maxHeight: 60, overflow: "hidden" }}>{s.out.slice(-200)}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {message && (
        <div style={{ marginBottom: 14, padding: "8px 12px", background: status === "done" ? "rgba(0,255,136,0.08)" : "rgba(255,51,102,0.08)", borderRadius: 8, fontSize: 12, color: status === "done" ? "#00ff88" : "#ff3366", fontFamily: "JetBrains Mono, monospace" }}>
          {message}
          {status === "done" && <div style={{ marginTop: 6, color: "rgba(180,210,240,0.5)", fontSize: 11 }}>Restart the server terminal to apply backend changes.</div>}
        </div>
      )}

      <button
        className="btn-primary"
        onClick={runUpdate}
        disabled={status === "running"}
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: status === "running" ? 0.7 : 1 }}
      >
        {status === "running" ? (
          <><span style={{ width: 13, height: 13, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", animation: "rotateGlow 0.8s linear infinite", display: "inline-block" }} /> UPDATING…</>
        ) : (
          <><RefreshCw size={13} /> {status === "done" ? "UPDATE AGAIN" : "CHECK FOR UPDATES"}</>
        )}
      </button>
    </motion.div>
  );
}

const SCAN_TYPES = [
  { value: "quick",    label: "QUICK",    desc: "Ping sweep only",           icon: "⚡" },
  { value: "standard", label: "STANDARD", desc: "Service version detection",  icon: "🔍" },
  { value: "intense",  label: "INTENSE",  desc: "Scripts + OS detection",    icon: "🔥" },
  { value: "stealth",  label: "STEALTH",  desc: "SYN stealth (needs admin)", icon: "👻" },
];

const PORT_PRESETS = [
  { label: "TOP 100",  value: "1-100"  },
  { label: "TOP 1000", value: "1-1000" },
  { label: "COMMON",   value: "21,22,23,25,53,80,110,143,443,3306,5432,6379,8080,8443,27017" },
  { label: "ALL",      value: "1-65535" },
];

const TIMEOUT_OPTS = [
  { label: "60s",  value: 60  },
  { label: "5min", value: 300 },
  { label: "15min",value: 900 },
];

function ts() { return new Date().toLocaleTimeString("en-GB", { hour12: false }); }

// ── Nmap status banner ──────────────────────────────────────────────────────
function NmapBanner({ health }) {
  if (!health) return null;
  if (health.nmapInstalled) return null; // all good — silent

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        margin: "0 32px 0",
        padding: "14px 20px",
        borderRadius: 12,
        background: "rgba(255,51,102,0.08)",
        border: "1px solid rgba(255,51,102,0.3)",
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
      }}
    >
      <XCircle size={18} color="#ff3366" style={{ flexShrink: 0, marginTop: 1 }} />
      <div>
        <div style={{ fontFamily: "Orbitron, sans-serif", fontSize: 12, color: "#ff3366", marginBottom: 6 }}>
          NMAP NOT FOUND — REAL SCANS DISABLED
        </div>
        <div style={{ fontSize: 12, color: "rgba(180,210,240,0.7)", lineHeight: 1.6 }}>
          Install Nmap from <a href="https://nmap.org/download.html" target="_blank" rel="noreferrer" style={{ color: "#00f5ff" }}>nmap.org/download.html</a>,
          then restart the server.<br />
          Detected path: <code style={{ color: "#a855f7" }}>{health.nmapBin}</code>
        </div>
      </div>
    </motion.div>
  );
}

// ── Scan error panel ─────────────────────────────────────────────────────────
function ErrorPanel({ message, onClose }) {
  const isPermission = message?.toLowerCase().includes("permission") || message?.toLowerCase().includes("administrator");
  const isNotFound   = message?.toLowerCase().includes("not found") || message?.toLowerCase().includes("install");

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      style={{
        padding: "20px 24px",
        background: "rgba(255,51,102,0.07)",
        border: "1px solid rgba(255,51,102,0.25)",
        borderRadius: 12,
        marginBottom: 20,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <AlertCircle size={16} color="#ff3366" />
        <span style={{ fontFamily: "Orbitron, sans-serif", fontSize: 12, color: "#ff3366" }}>
          SCAN FAILED
        </span>
        <button onClick={onClose} style={{ marginLeft: "auto", background: "none", border: "none", color: "rgba(180,210,240,0.4)", cursor: "pointer" }}>✕</button>
      </div>
      <p style={{ margin: 0, fontSize: 13, color: "rgba(180,210,240,0.8)", lineHeight: 1.6, fontFamily: "JetBrains Mono, monospace" }}>
        {message}
      </p>
      {isPermission && (
        <div style={{ marginTop: 12, padding: "10px 14px", background: "rgba(255,107,0,0.1)", borderRadius: 8, fontSize: 12, color: "#ff6b00" }}>
          💡 <strong>Fix:</strong> Right-click your terminal → "Run as Administrator", then restart <code>node server.js</code>
        </div>
      )}
      {isNotFound && (
        <div style={{ marginTop: 12, padding: "10px 14px", background: "rgba(0,245,255,0.07)", borderRadius: 8, fontSize: 12, color: "#00f5ff" }}>
          💡 <strong>Fix:</strong> Download Nmap from{" "}
          <a href="https://nmap.org/download.html" target="_blank" rel="noreferrer" style={{ color: "#a855f7" }}>
            nmap.org/download.html
          </a>
          {" "}→ install → restart the server.
        </div>
      )}
    </motion.div>
  );
}

export default function App() {
  const [tab,       setTab]       = useState("scan");
  const [target,    setTarget]    = useState("rathinam.in");
  const [ports,     setPorts]     = useState("1-1000");
  const [scanType,  setScanType]  = useState("standard");
  const [timeout,   setTimeout_]  = useState(300);
  const [scanning,  setScanning]  = useState(false);
  const [result,    setResult]    = useState(null);
  const [error,     setError]     = useState(null);
  const [logs,      setLogs]      = useState([]);
  const [history,   setHistory]   = useState([]);
  const [health,    setHealth]    = useState(null);
  const [showUpdate, setShowUpdate] = useState(false);

  useEffect(() => {
    axios.get("/api/health")
      .then(r => setHealth(r.data))
      .catch(() => setHealth({ nmapInstalled: false, nmapBin: "nmap" }));
  }, []);

  const addLog = useCallback((text, type = "info") => {
    setLogs(l => [...l, { text, type, time: ts() }]);
  }, []);

  const startScan = async () => {
    if (!target.trim() || scanning) return;
    setScanning(true);
    setResult(null);
    setError(null);
    setLogs([]);
    setTab("scan");

    addLog(`Target: ${target.trim()}`, "info");
    addLog(`Scan type: ${scanType} | Ports: ${ports} | Timeout: ${timeout}s`, "info");
    addLog("Launching nmap…", "info");

    try {
      const res = await axios.post("/api/scan", {
        target: target.trim(), ports, scanType, timeout,
      }, { timeout: (timeout + 30) * 1000 });

      const data = res.data;
      const openCount = data.hosts.reduce((a, h) => a + h.ports.filter(p => p.state === "open").length, 0);
      const risky     = data.hosts.filter(h => h.ports.some(p => [22,23,3306,5432,27017,6379,21,8080].includes(p.port) && p.state === "open"));

      if (data.meta?.elapsed) addLog(`nmap finished in ${data.meta.elapsed}s`, "success");
      addLog(`Hosts up: ${data.hosts.length} | Open ports: ${openCount}`, "success");
      if (risky.length > 0) addLog(`⚠ ${risky.length} host(s) with sensitive ports exposed`, "warn");

      setResult(data);
      setHistory(h => [{ ...data, id: Date.now() }, ...h.slice(0, 9)]);
    } catch (err) {
      const msg = err.response?.data?.error || err.message;
      addLog(`Error: ${msg}`, "error");
      setError(msg);
    } finally {
      setScanning(false);
    }
  };

  const nmapReady   = health?.nmapInstalled === true;
  const openPorts   = result ? result.hosts.reduce((a, h) => a + h.ports.filter(p => p.state === "open").length, 0) : 0;
  const riskyHosts  = result ? result.hosts.filter(h => h.ports.some(p => [22,23,3306,5432,27017,6379].includes(p.port) && p.state === "open")).length : 0;
  const elapsed     = result?.meta?.elapsed;

  return (
    <div style={{ position: "relative", zIndex: 1, minHeight: "100vh" }}>

      {/* ── Header ── */}
      <header style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "18px 32px",
        borderBottom: "1px solid rgba(0,245,255,0.08)",
        background: "rgba(2,11,24,0.9)",
        backdropFilter: "blur(20px)",
        position: "sticky", top: 0, zIndex: 50,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ position: "relative" }}>
            <Radar size={30} color="#00f5ff" style={{ filter: "drop-shadow(0 0 10px rgba(0,245,255,0.7))" }} />
            {scanning && <span style={{ position: "absolute", inset: -4, border: "2px solid rgba(0,245,255,0.4)", borderRadius: "50%", animation: "ping-slow 1.5s cubic-bezier(0,0,0.2,1) infinite" }} />}
          </div>
          <div>
            <h1 style={{ margin: 0, fontFamily: "Orbitron, sans-serif", fontSize: 21, fontWeight: 800, letterSpacing: "0.12em", background: "linear-gradient(135deg, #00f5ff, #a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              GHOSTMAP
            </h1>
            <div style={{ fontSize: 9, color: "rgba(180,210,240,0.4)", fontFamily: "Orbitron, sans-serif", letterSpacing: "0.18em" }}>
              NETWORK RECON DASHBOARD
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          {[
            { id: "scan",     icon: <List size={13} />,     label: "SCAN"     },
            { id: "topology", icon: <Globe size={13} />,    label: "TOPOLOGY" },
            { id: "history",  icon: <Activity size={13} />, label: "HISTORY"  },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "6px 14px", borderRadius: 8,
              background: tab === t.id ? "rgba(0,245,255,0.1)" : "transparent",
              border: `1px solid ${tab === t.id ? "rgba(0,245,255,0.3)" : "transparent"}`,
              color: tab === t.id ? "#00f5ff" : "rgba(180,210,240,0.45)",
              fontFamily: "Orbitron, sans-serif", fontSize: 10, letterSpacing: "0.1em",
              cursor: "pointer", transition: "all 0.2s",
            }}>
              {t.icon} {t.label}
            </button>
          ))}

          {/* Update button */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setShowUpdate(u => !u)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "6px 12px", borderRadius: 8,
                background: showUpdate ? "rgba(168,85,247,0.15)" : "rgba(168,85,247,0.07)",
                border: `1px solid ${showUpdate ? "rgba(168,85,247,0.5)" : "rgba(168,85,247,0.2)"}`,
                color: "#a855f7", fontFamily: "Orbitron, sans-serif",
                fontSize: 10, letterSpacing: "0.1em", cursor: "pointer", transition: "all 0.2s",
              }}
            >
              <RefreshCw size={12} /> UPDATE
            </button>
            <AnimatePresence>
              {showUpdate && <UpdatePanel onClose={() => setShowUpdate(false)} />}
            </AnimatePresence>
          </div>

          {/* nmap status pill */}
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "5px 14px", borderRadius: 99,
            background: health === null ? "rgba(180,210,240,0.04)"
              : nmapReady ? "rgba(0,255,136,0.09)" : "rgba(255,51,102,0.1)",
            border: `1px solid ${health === null ? "rgba(180,210,240,0.1)"
              : nmapReady ? "rgba(0,255,136,0.3)" : "rgba(255,51,102,0.3)"}`,
            fontSize: 10, fontFamily: "JetBrains Mono, monospace",
            color: health === null ? "rgba(180,210,240,0.4)"
              : nmapReady ? "#00ff88" : "#ff3366",
          }}>
            <div style={{
              width: 6, height: 6, borderRadius: "50%",
              background: health === null ? "rgba(180,210,240,0.3)" : nmapReady ? "#00ff88" : "#ff3366",
              boxShadow: nmapReady ? "0 0 6px #00ff88" : health ? "0 0 6px #ff3366" : "none",
            }} />
            {health === null ? "CHECKING…" : nmapReady ? `NMAP ${health.nmapVersion?.split(" ")[2] || "READY"}` : "NMAP MISSING"}
          </div>
        </div>
      </header>

      <NmapBanner health={health} />

      <main style={{ padding: "28px 32px", maxWidth: 1400, margin: "0 auto" }}>
        <AnimatePresence mode="wait">

          {/* ── SCAN TAB ── */}
          {tab === "scan" && (
            <motion.div key="scan" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>

              {/* Config panel */}
              <div className="glass" style={{ padding: 24, marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
                  <Settings size={15} color="#00f5ff" />
                  <span style={{ fontFamily: "Orbitron, sans-serif", fontSize: 11, letterSpacing: "0.12em", color: "#00f5ff" }}>
                    SCAN CONFIGURATION
                  </span>
                </div>

                {/* Target + ports */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 200px", gap: 14, marginBottom: 14 }}>
                  <div>
                    <label style={{ fontSize: 10, color: "rgba(180,210,240,0.5)", fontFamily: "Orbitron, sans-serif", letterSpacing: "0.1em", display: "block", marginBottom: 5 }}>
                      TARGET  <span style={{ color: "rgba(180,210,240,0.3)", fontFamily: "Inter, sans-serif", letterSpacing: 0, fontWeight: 400 }}>— IP, CIDR, or domain</span>
                    </label>
                    <input
                      className="ghost-input"
                      value={target}
                      onChange={e => setTarget(e.target.value)}
                      placeholder="192.168.1.0/24 · 10.0.0.1 · rathinam.in"
                      onKeyDown={e => e.key === "Enter" && !scanning && startScan()}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 10, color: "rgba(180,210,240,0.5)", fontFamily: "Orbitron, sans-serif", letterSpacing: "0.1em", display: "block", marginBottom: 5 }}>
                      PORTS
                    </label>
                    <input
                      className="ghost-input"
                      value={ports}
                      onChange={e => setPorts(e.target.value)}
                      placeholder="1-1000"
                    />
                  </div>
                </div>

                {/* Saved targets */}
                <div style={{ marginBottom: 14 }}>
                  <SavedTargets
                    currentTarget={target}
                    onSelect={(val) => { setTarget(val); }}
                  />
                </div>

                {/* Port presets */}
                <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
                  {PORT_PRESETS.map(p => (
                    <button key={p.value} onClick={() => setPorts(p.value)} style={{
                      padding: "4px 12px", borderRadius: 8, cursor: "pointer", transition: "all 0.2s",
                      border: `1px solid ${ports === p.value ? "rgba(0,245,255,0.4)" : "rgba(180,210,240,0.1)"}`,
                      background: ports === p.value ? "rgba(0,245,255,0.1)" : "transparent",
                      color: ports === p.value ? "#00f5ff" : "rgba(180,210,240,0.4)",
                      fontSize: 10, fontFamily: "Orbitron, sans-serif",
                    }}>{p.label}</button>
                  ))}
                  <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 10, color: "rgba(180,210,240,0.4)", fontFamily: "Orbitron, sans-serif" }}>TIMEOUT</span>
                    {TIMEOUT_OPTS.map(o => (
                      <button key={o.value} onClick={() => setTimeout_(o.value)} style={{
                        padding: "4px 10px", borderRadius: 8, cursor: "pointer", transition: "all 0.2s",
                        border: `1px solid ${timeout === o.value ? "rgba(168,85,247,0.4)" : "rgba(180,210,240,0.1)"}`,
                        background: timeout === o.value ? "rgba(168,85,247,0.1)" : "transparent",
                        color: timeout === o.value ? "#a855f7" : "rgba(180,210,240,0.4)",
                        fontSize: 10, fontFamily: "Orbitron, sans-serif",
                      }}>{o.label}</button>
                    ))}
                  </div>
                </div>

                {/* Scan type */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 18 }}>
                  {SCAN_TYPES.map(s => (
                    <button key={s.value} onClick={() => setScanType(s.value)} style={{
                      padding: "12px 14px", borderRadius: 10, cursor: "pointer", textAlign: "left", transition: "all 0.2s",
                      border: `1px solid ${scanType === s.value ? "rgba(0,245,255,0.35)" : "rgba(180,210,240,0.07)"}`,
                      background: scanType === s.value ? "rgba(0,245,255,0.07)" : "rgba(5,20,40,0.5)",
                    }}>
                      <div style={{ fontSize: 17, marginBottom: 4 }}>{s.icon}</div>
                      <div style={{ fontFamily: "Orbitron, sans-serif", fontSize: 10, letterSpacing: "0.1em", color: scanType === s.value ? "#00f5ff" : "rgba(180,210,240,0.5)" }}>
                        {s.label}
                      </div>
                      <div style={{ fontSize: 10, color: "rgba(180,210,240,0.3)", marginTop: 2 }}>{s.desc}</div>
                    </button>
                  ))}
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: 12 }}>
                  <button
                    className="btn-primary"
                    onClick={startScan}
                    disabled={scanning || !health}
                    style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: (scanning || !health) ? 0.6 : 1 }}
                  >
                    {scanning ? (
                      <>
                        <span style={{ width: 13, height: 13, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", animation: "rotateGlow 0.8s linear infinite", display: "inline-block" }} />
                        SCANNING {target}…
                      </>
                    ) : (
                      <><Play size={13} /> LAUNCH SCAN</>
                    )}
                  </button>
                  {result && (
                    <button className="btn-danger" onClick={() => { setResult(null); setError(null); setLogs([]); }}
                      style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <StopCircle size={13} /> CLEAR
                    </button>
                  )}
                </div>
              </div>

              {/* Error */}
              {error && <ErrorPanel message={error} onClose={() => setError(null)} />}

              {/* Stats */}
              {result && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 12, marginBottom: 20 }}>
                  <StatCard icon="Wifi"          label="HOSTS UP"    value={result.hosts.length}  color="cyan"   delay={0.0} />
                  <StatCard icon="Server"        label="OPEN PORTS"  value={openPorts}            color="green"  delay={0.1} />
                  <StatCard icon="AlertTriangle" label="RISKY HOSTS" value={riskyHosts}           color="orange" delay={0.2} />
                  <StatCard icon="Shield"        label="CRITICAL"    value={result.hosts.filter(h => h.riskLevel === 'CRITICAL').length} color="red" delay={0.3} />
                  <StatCard icon="Activity"      label="ELAPSED"     value={elapsed ? `${elapsed}s` : "—"} color="cyan" delay={0.4} />
                </div>
              )}

              {/* Live log */}
              <div style={{ marginBottom: 20 }}>
                <ScanLog
                  wsUrl={
                    window.location.hostname === "localhost" && window.location.port === "5173"
                      ? "ws://localhost:5000/ws"
                      : `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}/ws`
                  }
                  localLogs={logs}
                />
              </div>

              {/* Results */}
              {result && (
                <motion.div key="results" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35 }} className="glass" style={{ padding: 24 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
                  <Eye size={15} color="#00f5ff" />
                  <span style={{ fontFamily: "Orbitron, sans-serif", fontSize: 11, letterSpacing: "0.1em", color: "#00f5ff" }}>
                    RESULTS — {result.target}
                  </span>
                  <span style={{ marginLeft: "auto", fontSize: 11, color: "rgba(180,210,240,0.3)", fontFamily: "JetBrains Mono, monospace" }}>
                    {new Date(result.timestamp).toLocaleString()}
                  </span>
                  {/* Export buttons */}
                  <button onClick={() => exportJSON(result)} style={{
                    display: "flex", alignItems: "center", gap: 5, padding: "4px 12px",
                    borderRadius: 7, background: "rgba(0,255,136,0.08)", border: "1px solid rgba(0,255,136,0.25)",
                    color: "#00ff88", fontSize: 10, fontFamily: "Orbitron, sans-serif", cursor: "pointer",
                  }}>
                    <FileJson size={11} /> JSON
                  </button>
                  <button onClick={() => exportPDF(result)} style={{
                    display: "flex", alignItems: "center", gap: 5, padding: "4px 12px",
                    borderRadius: 7, background: "rgba(168,85,247,0.08)", border: "1px solid rgba(168,85,247,0.25)",
                    color: "#a855f7", fontSize: 10, fontFamily: "Orbitron, sans-serif", cursor: "pointer",
                  }}>
                    <FileText size={11} /> PDF
                  </button>
                </div>
                    {result.meta?.args && (
                      <code style={{ fontSize: 10, color: "rgba(168,85,247,0.6)", background: "rgba(168,85,247,0.07)", padding: "2px 8px", borderRadius: 6 }}>
                        {result.meta.args}
                      </code>
                    )}
                  <HostList hosts={result.hosts} />
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ── TOPOLOGY TAB ── */}
          {tab === "topology" && (
            <motion.div key="topo" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="glass" style={{ padding: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                  <Globe size={15} color="#00f5ff" />
                  <span style={{ fontFamily: "Orbitron, sans-serif", fontSize: 11, letterSpacing: "0.1em", color: "#00f5ff" }}>NETWORK TOPOLOGY</span>
                  {result && <span style={{ marginLeft: "auto", fontSize: 11, color: "rgba(180,210,240,0.35)", fontFamily: "JetBrains Mono, monospace" }}>{result.hosts.length} nodes · drag to rearrange</span>}
                </div>
                <TopologyMap hosts={result?.hosts} />
              </div>
            </motion.div>
          )}

          {/* ── HISTORY TAB ── */}
          {tab === "history" && (
            <motion.div key="hist" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="glass" style={{ padding: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
                  <Activity size={15} color="#00f5ff" />
                  <span style={{ fontFamily: "Orbitron, sans-serif", fontSize: 11, letterSpacing: "0.1em", color: "#00f5ff" }}>SCAN HISTORY</span>
                </div>
                {history.length === 0 ? (
                  <p style={{ color: "rgba(180,210,240,0.3)", fontFamily: "JetBrains Mono, monospace", fontSize: 13 }}>No scans yet</p>
                ) : (
                  <table className="ghost-table">
                    <thead><tr><th>TIME</th><th>TARGET</th><th>TYPE</th><th>HOSTS</th><th>PORTS</th><th>ELAPSED</th></tr></thead>
                    <tbody>
                      {history.map(h => (
                        <tr key={h.id} onClick={() => { setResult(h); setTab("scan"); }} style={{ cursor: "pointer" }}>
                          <td>{new Date(h.timestamp).toLocaleTimeString()}</td>
                          <td style={{ color: "#00f5ff" }}>{h.target}</td>
                          <td>{h.scanType?.toUpperCase()}</td>
                          <td>{h.hosts.length}</td>
                          <td>{h.hosts.reduce((a, host) => a + host.ports.filter(p => p.state === "open").length, 0)}</td>
                          <td>{h.meta?.elapsed ? `${h.meta.elapsed}s` : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* Scan sweep line */}
      {scanning && (
        <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 100, overflow: "hidden" }}>
          <div className="scan-line" />
        </div>
      )}
    </div>
  );
}
