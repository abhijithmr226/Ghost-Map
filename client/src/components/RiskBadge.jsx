import { motion } from "framer-motion";

const CONFIG = {
  CRITICAL: { bg: "rgba(255,51,102,0.18)", border: "rgba(255,51,102,0.5)", color: "#ff3366", glow: "rgba(255,51,102,0.4)", bar: "#ff3366" },
  HIGH:     { bg: "rgba(255,107,0,0.18)",  border: "rgba(255,107,0,0.5)",  color: "#ff6b00", glow: "rgba(255,107,0,0.4)",  bar: "#ff6b00" },
  MEDIUM:   { bg: "rgba(255,200,0,0.12)",  border: "rgba(255,200,0,0.4)",  color: "#ffc800", glow: "rgba(255,200,0,0.3)",  bar: "#ffc800" },
  LOW:      { bg: "rgba(0,255,136,0.1)",   border: "rgba(0,255,136,0.3)",  color: "#00ff88", glow: "rgba(0,255,136,0.25)", bar: "#00ff88" },
};

export default function RiskBadge({ level = "LOW", score = 0, showBar = false }) {
  const c = CONFIG[level] || CONFIG.LOW;
  return (
    <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <motion.div
        whileHover={{ scale: 1.05 }}
        style={{
          display: "inline-flex", alignItems: "center", gap: 5,
          padding: "3px 10px", borderRadius: 99,
          background: c.bg, border: `1px solid ${c.border}`,
          color: c.color, fontSize: 10,
          fontFamily: "Orbitron, sans-serif", letterSpacing: "0.1em",
          boxShadow: `0 0 8px ${c.glow}`,
          whiteSpace: "nowrap",
        }}
      >
        <div style={{ width: 5, height: 5, borderRadius: "50%", background: c.color, boxShadow: `0 0 5px ${c.color}` }} />
        {level}
        {score > 0 && <span style={{ opacity: 0.7, fontSize: 9 }}>{score}</span>}
      </motion.div>
      {showBar && (
        <div className="sev-bar" style={{ width: 70 }}>
          <motion.div
            className="sev-bar-fill"
            style={{ background: c.bar }}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(score, 100)}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
      )}
    </div>
  );
}
