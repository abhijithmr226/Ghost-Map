import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Terminal, Wifi } from "lucide-react";

const LEVEL_STYLE = {
  info:     { color: "rgba(180,210,240,0.7)" },
  progress: { color: "rgba(0,245,255,0.6)"   },
  success:  { color: "#00ff88"               },
  warn:     { color: "#ff6b00"               },
  error:    { color: "#ff3366"               },
  cmd:      { color: "#a855f7"               },
};

export default function LiveScanLog({ wsUrl, localLogs }) {
  const [wsLogs,   setWsLogs]   = useState([]);
  const [wsStatus, setWsStatus] = useState("disconnected");
  const bottomRef = useRef(null);
  const wsRef     = useRef(null);

  useEffect(() => {
    if (!wsUrl) return;

    const connect = () => {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen  = () => setWsStatus("connected");
      ws.onclose = () => { setWsStatus("disconnected"); };
      ws.onerror = () => setWsStatus("error");

      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data);
          if (msg.type === "log") {
            setWsLogs(l => [...l.slice(-200), {
              text:  msg.text,
              level: msg.level || "info",
              time:  new Date().toLocaleTimeString("en-GB", { hour12: false }),
            }]);
          }
          if (msg.type === "scanComplete" || msg.type === "scanError") {
            setWsStatus("connected");
          }
        } catch {}
      };
    };

    connect();
    return () => wsRef.current?.close();
  }, [wsUrl]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [wsLogs, localLogs]);

  const allLogs = wsUrl ? wsLogs : localLogs;

  return (
    <div style={{
      background: "rgba(0,5,15,0.92)",
      border: "1px solid rgba(0,245,255,0.1)",
      borderRadius: 12,
      padding: "12px 16px",
      height: 220,
      overflowY: "auto",
      fontFamily: "JetBrains Mono, monospace",
      fontSize: 11.5,
      lineHeight: 1.7,
      position: "relative",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <Terminal size={12} color="rgba(0,245,255,0.6)" />
        <span style={{ fontFamily: "Orbitron, sans-serif", fontSize: 9, letterSpacing: "0.12em", color: "rgba(0,245,255,0.5)" }}>
          LIVE SCAN LOG
        </span>
        {wsUrl && (
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{
              width: 5, height: 5, borderRadius: "50%",
              background: wsStatus === "connected" ? "#00ff88" : wsStatus === "error" ? "#ff3366" : "#ff6b00",
              boxShadow: wsStatus === "connected" ? "0 0 6px #00ff88" : "none",
            }} />
            <span style={{ fontSize: 9, color: "rgba(180,210,240,0.35)", fontFamily: "Orbitron, sans-serif", letterSpacing: "0.08em" }}>
              {wsStatus === "connected" ? "WS LIVE" : wsStatus.toUpperCase()}
            </span>
          </div>
        )}
      </div>

      {/* Log lines */}
      <AnimatePresence initial={false}>
        {allLogs.length === 0 ? (
          <div style={{ color: "rgba(180,210,240,0.2)" }}>Awaiting scan…</div>
        ) : allLogs.map((line, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.15 }}
            style={{ ...LEVEL_STYLE[line.level] || LEVEL_STYLE.info }}
          >
            <span style={{ color: "rgba(0,245,255,0.25)", marginRight: 8 }}>[{line.time}]</span>
            {line.text}
          </motion.div>
        ))}
      </AnimatePresence>
      <div ref={bottomRef} />
    </div>
  );
}
