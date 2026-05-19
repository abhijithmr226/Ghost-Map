import { motion } from "framer-motion";
import { Shield, Terminal, Activity, AlertTriangle, Wifi, Server } from "lucide-react";

const icons = { Shield, Terminal, Activity, AlertTriangle, Wifi, Server };

export default function StatCard({ icon, label, value, sub, color = "cyan", delay = 0 }) {
  const Icon = icons[icon] || Activity;
  const colorMap = {
    cyan:   { text: "#00f5ff", bg: "rgba(0,245,255,0.08)", border: "rgba(0,245,255,0.2)" },
    purple: { text: "#a855f7", bg: "rgba(168,85,247,0.08)", border: "rgba(168,85,247,0.2)" },
    green:  { text: "#00ff88", bg: "rgba(0,255,136,0.08)", border: "rgba(0,255,136,0.2)" },
    red:    { text: "#ff3366", bg: "rgba(255,51,102,0.08)", border: "rgba(255,51,102,0.2)" },
    orange: { text: "#ff6b00", bg: "rgba(255,107,0,0.08)", border: "rgba(255,107,0,0.2)" },
  };
  const c = colorMap[color] || colorMap.cyan;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      whileHover={{ y: -3 }}
      className="stat-card"
      style={{ borderColor: c.border }}
    >
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-lg" style={{ background: c.bg }}>
          <Icon size={16} style={{ color: c.text }} />
        </div>
        <span style={{ color: "rgba(180,210,240,0.55)", fontSize: 11, fontFamily: "Orbitron, sans-serif", letterSpacing: "0.1em" }}>
          {label}
        </span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, fontFamily: "Orbitron, sans-serif", color: c.text, lineHeight: 1 }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 11, color: "rgba(180,210,240,0.45)", marginTop: 4, fontFamily: "JetBrains Mono, monospace" }}>
          {sub}
        </div>
      )}
    </motion.div>
  );
}
