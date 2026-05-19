import { useCallback, useMemo } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
} from "reactflow";
import "reactflow/dist/style.css";
import { motion } from "framer-motion";

const ROUTER_ID = "router";

function buildGraph(hosts) {
  const nodes = [];
  const edges = [];

  // Router node (center)
  nodes.push({
    id: ROUTER_ID,
    type: "default",
    position: { x: 400, y: 300 },
    data: { label: "🔌 Gateway" },
    style: {
      background: "linear-gradient(135deg, #003344, #001a2e)",
      border: "2px solid #00f5ff",
      borderRadius: 12,
      color: "#00f5ff",
      fontFamily: "Orbitron, sans-serif",
      fontSize: 12,
      fontWeight: 600,
      padding: "10px 16px",
      boxShadow: "0 0 20px rgba(0,245,255,0.3)",
    },
  });

  const count = hosts.length;
  const radius = Math.max(180, count * 35);

  hosts.forEach((host, i) => {
    const angle = (2 * Math.PI * i) / count - Math.PI / 2;
    const x = 400 + radius * Math.cos(angle);
    const y = 300 + radius * Math.sin(angle);

    const openPorts = host.ports.filter(p => p.state === "open");
    const isRisky   = openPorts.some(p => [22, 23, 3306, 5432, 27017, 6379].includes(p.port));
    const borderColor = isRisky ? "#ff6b00" : "#00f5ff";
    const glowColor   = isRisky ? "rgba(255,107,0,0.3)" : "rgba(0,245,255,0.2)";

    const osEmoji = host.os?.toLowerCase().includes("windows") ? "🪟"
      : host.os?.toLowerCase().includes("mac") ? "🍎"
      : host.os?.toLowerCase().includes("linux") || host.os?.toLowerCase().includes("ubuntu") ? "🐧"
      : "🖥️";

    nodes.push({
      id: host.ip,
      position: { x, y },
      data: {
        label: (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 16 }}>{osEmoji}</div>
            <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "#00f5ff" }}>{host.ip}</div>
            <div style={{ fontSize: 9, color: "rgba(180,210,240,0.5)", marginTop: 2 }}>
              {openPorts.length} open port{openPorts.length !== 1 ? "s" : ""}
            </div>
          </div>
        ),
      },
      style: {
        background: "rgba(5,20,40,0.85)",
        border: `1.5px solid ${borderColor}`,
        borderRadius: 10,
        padding: "8px 12px",
        boxShadow: `0 0 14px ${glowColor}`,
        minWidth: 100,
      },
    });

    edges.push({
      id: `e-${ROUTER_ID}-${host.ip}`,
      source: ROUTER_ID,
      target: host.ip,
      style: {
        stroke: isRisky ? "#ff6b00" : "#00f5ff",
        strokeWidth: 1.5,
        opacity: 0.5,
      },
      animated: isRisky,
    });
  });

  return { nodes, edges };
}

export default function TopologyMap({ hosts }) {
  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => (hosts?.length ? buildGraph(hosts) : { nodes: [], edges: [] }),
    [hosts]
  );

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const onConnect = useCallback((params) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

  if (!hosts || hosts.length === 0) {
    return (
      <div style={{
        height: 300,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "rgba(180,210,240,0.3)",
        fontFamily: "Orbitron, sans-serif",
        fontSize: 13,
        letterSpacing: "0.1em",
      }}>
        RUN A SCAN TO SEE TOPOLOGY
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{ height: 480, borderRadius: 12, overflow: "hidden" }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="rgba(0,245,255,0.06)" gap={30} size={1} />
        <Controls
          style={{
            background: "rgba(5,20,40,0.8)",
            border: "1px solid rgba(0,245,255,0.15)",
            borderRadius: 8,
          }}
        />
        <MiniMap
          style={{
            background: "rgba(2,11,24,0.9)",
            border: "1px solid rgba(0,245,255,0.15)",
          }}
          nodeColor={(n) => n.id === ROUTER_ID ? "#00f5ff" : "rgba(0,245,255,0.4)"}
        />
      </ReactFlow>
    </motion.div>
  );
}
