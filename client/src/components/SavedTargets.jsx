import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Trash2, Play, Plus, X } from "lucide-react";

const STORAGE_KEY = "ghostmap_saved_targets";

function load() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
}
function save(list) { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); }

const EXAMPLES = [
  { label: "Scanme (nmap.org)", value: "scanme.nmap.org" },
  { label: "Local network",     value: "192.168.1.0/24"  },
  { label: "Loopback",          value: "127.0.0.1"       },
];

export default function SavedTargets({ currentTarget, onSelect }) {
  const [targets, setTargets] = useState(load);
  const [adding,  setAdding]  = useState(false);
  const [newVal,  setNewVal]  = useState("");

  useEffect(() => { save(targets); }, [targets]);

  const add = (val) => {
    const v = (val || newVal).trim();
    if (!v || targets.some(t => t.value === v)) return;
    setTargets(t => [{ value: v, label: v, added: Date.now() }, ...t]);
    setNewVal(""); setAdding(false);
  };

  const remove = (val) => setTargets(t => t.filter(x => x.value !== val));

  return (
    <div style={{
      background: "rgba(5,20,40,0.65)",
      border: "1px solid rgba(0,245,255,0.1)",
      borderRadius: 12, padding: "14px 16px",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <Star size={13} color="#00f5ff" />
        <span style={{ fontFamily: "Orbitron, sans-serif", fontSize: 10, letterSpacing: "0.12em", color: "#00f5ff" }}>
          SAVED TARGETS
        </span>
        <button
          onClick={() => add(currentTarget)}
          title="Save current target"
          style={{
            marginLeft: "auto", display: "flex", alignItems: "center", gap: 5,
            padding: "3px 10px", borderRadius: 6,
            background: "rgba(0,245,255,0.08)", border: "1px solid rgba(0,245,255,0.2)",
            color: "#00f5ff", fontSize: 10, fontFamily: "Orbitron, sans-serif",
            cursor: "pointer", letterSpacing: "0.08em",
          }}
        >
          <Plus size={10} /> SAVE CURRENT
        </button>
        <button
          onClick={() => setAdding(a => !a)}
          style={{
            display: "flex", alignItems: "center", gap: 5,
            padding: "3px 10px", borderRadius: 6,
            background: adding ? "rgba(168,85,247,0.1)" : "transparent",
            border: `1px solid ${adding ? "rgba(168,85,247,0.3)" : "rgba(180,210,240,0.1)"}`,
            color: adding ? "#a855f7" : "rgba(180,210,240,0.4)",
            fontSize: 10, fontFamily: "Orbitron, sans-serif", cursor: "pointer",
          }}
        >
          <Plus size={10} /> ADD
        </button>
      </div>

      {/* Add input */}
      <AnimatePresence>
        {adding && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} style={{ overflow: "hidden", marginBottom: 10 }}
          >
            <div style={{ display: "flex", gap: 8 }}>
              <input
                autoFocus
                className="ghost-input"
                value={newVal}
                onChange={e => setNewVal(e.target.value)}
                onKeyDown={e => e.key === "Enter" && add()}
                placeholder="IP, CIDR, or domain…"
                style={{ flex: 1 }}
              />
              <button className="btn-primary" onClick={() => add()} style={{ padding: "8px 16px" }}>ADD</button>
            </div>
            {/* Examples */}
            <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
              {EXAMPLES.map(e => (
                <button key={e.value} onClick={() => add(e.value)} style={{
                  padding: "3px 10px", borderRadius: 6, cursor: "pointer",
                  background: "rgba(168,85,247,0.08)", border: "1px solid rgba(168,85,247,0.2)",
                  color: "#a855f7", fontSize: 10, fontFamily: "JetBrains Mono, monospace",
                }}>{e.label}</button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* List */}
      {targets.length === 0 ? (
        <p style={{ color: "rgba(180,210,240,0.25)", fontSize: 11, fontFamily: "JetBrains Mono, monospace", margin: 0 }}>
          No saved targets — save a target to scan it quickly
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <AnimatePresence>
            {targets.map(t => (
              <motion.div
                key={t.value}
                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8, height: 0 }}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "8px 12px", borderRadius: 8,
                  background: currentTarget === t.value ? "rgba(0,245,255,0.07)" : "rgba(0,0,0,0.2)",
                  border: `1px solid ${currentTarget === t.value ? "rgba(0,245,255,0.2)" : "rgba(180,210,240,0.06)"}`,
                  transition: "all 0.2s",
                }}
              >
                <span style={{
                  flex: 1, fontFamily: "JetBrains Mono, monospace", fontSize: 12,
                  color: currentTarget === t.value ? "#00f5ff" : "rgba(180,210,240,0.7)",
                }}>
                  {t.value}
                </span>
                <button
                  onClick={() => onSelect(t.value)}
                  title="Scan this target"
                  style={{
                    display: "flex", alignItems: "center", gap: 4,
                    padding: "3px 10px", borderRadius: 6,
                    background: "rgba(0,245,255,0.08)", border: "1px solid rgba(0,245,255,0.2)",
                    color: "#00f5ff", fontSize: 10, fontFamily: "Orbitron, sans-serif",
                    cursor: "pointer", letterSpacing: "0.06em",
                  }}
                >
                  <Play size={9} /> SCAN
                </button>
                <button onClick={() => remove(t.value)} title="Remove" style={{
                  background: "none", border: "none", color: "rgba(180,210,240,0.3)",
                  cursor: "pointer", padding: "2px 4px", borderRadius: 4,
                }}>
                  <Trash2 size={12} />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
