import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronRight, Shield, AlertCircle, ExternalLink } from "lucide-react";
import axios from "axios";
import RiskBadge from "./RiskBadge";

function PortBadge({ state }) {
  const cls = state === "open" ? "badge-open" : state === "filtered" ? "badge-filter" : "badge-closed";
  return <span className={`badge ${cls}`}>{state}</span>;
}

function SeverityBadge({ severity }) {
  const s = (severity || "").toUpperCase();
  const cls = s === "CRITICAL" ? "badge-crit" : s === "HIGH" ? "badge-high" : s === "MEDIUM" ? "badge-med" : "badge-low";
  return <span className={`badge ${cls}`}>{s || "INFO"}</span>;
}

function CVEPanel({ service, product, version }) {
  const [cves, setCves] = useState(null);
  const [loading, setLoading] = useState(false);

  const lookup = async () => {
    setLoading(true);
    try {
      const res = await axios.post("/api/cve", { service, product, version });
      setCves(res.data.cves);
    } catch {
      setCves([]);
    } finally {
      setLoading(false);
    }
  };

  if (cves === null) {
    return (
      <button
        onClick={lookup}
        disabled={loading}
        style={{
          marginTop: 8,
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: 11,
          color: "#a855f7",
          background: "rgba(168,85,247,0.08)",
          border: "1px solid rgba(168,85,247,0.25)",
          borderRadius: 8,
          padding: "4px 12px",
          cursor: "pointer",
          fontFamily: "Orbitron, sans-serif",
          letterSpacing: "0.06em",
          transition: "all 0.2s",
        }}
      >
        <Shield size={11} /> {loading ? "Looking up..." : "CHECK CVEs"}
      </button>
    );
  }

  if (cves.length === 0) {
    return <p style={{ fontSize: 12, color: "rgba(0,255,136,0.7)", marginTop: 6 }}>✓ No known CVEs found</p>;
  }

  return (
    <div style={{ marginTop: 10 }}>
      <p style={{ fontSize: 11, color: "#a855f7", fontFamily: "Orbitron, sans-serif", marginBottom: 6 }}>
        {cves.length} CVE{cves.length > 1 ? "s" : ""} FOUND
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {cves.map(cve => (
          <div key={cve.id} style={{
            background: "rgba(0,0,0,0.3)",
            border: "1px solid rgba(255,51,102,0.2)",
            borderRadius: 8,
            padding: "8px 12px",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 12, color: "#ff3366" }}>
                {cve.id}
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <SeverityBadge severity={cve.severity} />
                <span style={{ fontSize: 11, color: "rgba(180,210,240,0.5)" }}>
                  {cve.score > 0 ? `${cve.score}/10` : ""}
                </span>
                <a href={cve.url} target="_blank" rel="noreferrer" style={{ color: "#00f5ff" }}>
                  <ExternalLink size={12} />
                </a>
              </div>
            </div>
            <p style={{ fontSize: 11, color: "rgba(180,210,240,0.65)", margin: 0, lineHeight: 1.5 }}>
              {cve.description.slice(0, 160)}{cve.description.length > 160 ? "…" : ""}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function HostRow({ host, index }) {
  const [open, setOpen] = useState(false);
  const openPorts  = host.ports.filter(p => p.state === "open");
  const critPorts  = [22, 23, 3306, 5432, 27017, 6379];
  const hasRisk    = openPorts.some(p => critPorts.includes(p.port));

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.06 }}
      style={{ marginBottom: 8 }}
    >
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          background: "rgba(5,20,40,0.7)",
          border: `1px solid ${hasRisk ? "rgba(255,107,0,0.2)" : "rgba(0,245,255,0.1)"}`,
          borderRadius: open ? "12px 12px 0 0" : 12,
          cursor: "pointer",
          transition: "border-color 0.2s",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ position: "relative", width: 10, height: 10 }}>
            <div style={{
              width: 10, height: 10, borderRadius: "50%",
              background: host.state === "up" ? "#00ff88" : "#ff3366",
              boxShadow: `0 0 8px ${host.state === "up" ? "#00ff88" : "#ff3366"}`,
            }} />
          </div>
          <div>
            <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 14, color: "#00f5ff" }}>
              {host.ip}
            </div>
            {host.hostname && (
              <div style={{ fontSize: 11, color: "rgba(180,210,240,0.5)", marginTop: 1 }}>
                {host.hostname}
              </div>
            )}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <RiskBadge level={host.riskLevel || "LOW"} score={host.riskScore || 0} showBar />
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, color: "rgba(180,210,240,0.5)", fontFamily: "Orbitron, sans-serif", letterSpacing: "0.08em" }}>
              {host.os}
            </div>
            {host.vendor && (
              <div style={{ fontSize: 10, color: "rgba(180,210,240,0.35)" }}>{host.vendor}</div>
            )}
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "Orbitron, sans-serif", color: openPorts.length > 0 ? "#00f5ff" : "rgba(180,210,240,0.4)" }}>
              {openPorts.length}
            </div>
            <div style={{ fontSize: 9, color: "rgba(180,210,240,0.4)", letterSpacing: "0.1em" }}>PORTS</div>
          </div>
          {open ? <ChevronDown size={16} color="rgba(180,210,240,0.5)" /> : <ChevronRight size={16} color="rgba(180,210,240,0.5)" />}
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{ overflow: "hidden" }}
          >
            <div style={{
              background: "rgba(2,11,24,0.8)",
              border: "1px solid rgba(0,245,255,0.08)",
              borderTop: "none",
              borderRadius: "0 0 12px 12px",
              padding: "16px",
            }}>
              {host.ports.length === 0 ? (
                <p style={{ color: "rgba(180,210,240,0.4)", fontSize: 13 }}>No ports scanned / all filtered</p>
              ) : (
                <table className="ghost-table">
                  <thead>
                    <tr>
                      <th>PORT</th>
                      <th>STATE</th>
                      <th>SERVICE</th>
                      <th>PRODUCT / VERSION</th>
                      <th>CVE LOOKUP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {host.ports.map(port => (
                      <tr key={`${port.port}-${port.protocol}`}>
                        <td>
                          <span style={{ color: "#00f5ff", fontWeight: 600 }}>{port.port}</span>
                          <span style={{ color: "rgba(180,210,240,0.4)", fontSize: 10 }}>/{port.protocol}</span>
                        </td>
                        <td><PortBadge state={port.state} /></td>
                        <td>{port.service}</td>
                        <td>
                          {port.product && (
                            <span>
                              {port.product}
                              {port.version && <span style={{ color: "rgba(180,210,240,0.5)" }}> {port.version}</span>}
                            </span>
                          )}
                        </td>
                        <td>
                          {port.state === "open" && (port.product || port.service) && (
                            <CVEPanel service={port.service} product={port.product} version={port.version} />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function HostList({ hosts }) {
  if (!hosts || hosts.length === 0) return null;

  return (
    <div>
      <div style={{
        fontFamily: "Orbitron, sans-serif",
        fontSize: 11,
        letterSpacing: "0.12em",
        color: "rgba(180,210,240,0.5)",
        marginBottom: 12,
      }}>
        {hosts.length} HOST{hosts.length > 1 ? "S" : ""} DISCOVERED
      </div>
      {hosts.map((host, i) => <HostRow key={host.ip} host={host} index={i} />)}
    </div>
  );
}
