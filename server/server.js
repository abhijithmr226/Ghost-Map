const express   = require("express");
const cors      = require("cors");
const http      = require("http");
const https     = require("https");
const { WebSocketServer } = require("ws");
const { spawn, exec } = require("child_process");
const path      = require("path");
const fs        = require("fs");

const app    = express();
const server = http.createServer(app);
const wss    = new WebSocketServer({ server, path: "/ws" });

app.use(cors());
app.use(express.json());

// ─── Locate nmap ─────────────────────────────────────────────────────────────
function findNmap() {
  if (process.env.NMAP_PATH) return process.env.NMAP_PATH;
  const windowsPaths = [
    "C:\\Program Files (x86)\\Nmap\\nmap.exe",
    "C:\\Program Files\\Nmap\\nmap.exe",
    path.join(process.env.ProgramFiles  || "", "Nmap", "nmap.exe"),
    path.join(process.env["ProgramFiles(x86)"] || "", "Nmap", "nmap.exe"),
  ];
  for (const p of windowsPaths) { try { if (fs.existsSync(p)) return p; } catch {} }
  return "nmap";
}
const NMAP_BIN = findNmap();

exec(`"${NMAP_BIN}" --version`, (err, stdout) => {
  if (err) console.error(`\n⚠  nmap NOT found at: ${NMAP_BIN}\n`);
  else console.log(`\n✅ nmap: ${stdout.split("\n")[0]}  |  ${NMAP_BIN}\n`);
});

// ─── Risk scoring ─────────────────────────────────────────────────────────────
const RISK_PORTS = {
  critical: [23, 512, 513, 514, 1900, 5900],          // telnet, rsh, VNC, SSDP
  high:     [21, 3306, 5432, 6379, 27017, 9200, 11211], // ftp, db, redis, mongo, elastic, memcache
  medium:   [22, 25, 110, 143, 8080, 8443, 3389],      // ssh, smtp, pop, imap, alt-http, rdp
  low:      [80, 443, 53, 8000, 8888],
};

function scoreHost(host) {
  let score = 0;
  const openPorts = host.ports.filter(p => p.state === "open");
  for (const p of openPorts) {
    if (RISK_PORTS.critical.includes(p.port)) score += 40;
    else if (RISK_PORTS.high.includes(p.port))     score += 20;
    else if (RISK_PORTS.medium.includes(p.port))   score += 10;
    else score += 2;
  }
  const level = score >= 60 ? "CRITICAL" : score >= 30 ? "HIGH" : score >= 10 ? "MEDIUM" : "LOW";
  return { score: Math.min(score, 100), level };
}

// ─── Parse nmap XML ───────────────────────────────────────────────────────────
function parseNmapXml(xml) {
  const hosts = [];
  const hostBlocks = xml.match(/<host[\s\S]*?<\/host>/g) || [];
  for (const block of hostBlocks) {
    const stateMatch = block.match(/<status[^>]*state="([^"]+)"/);
    if (stateMatch && stateMatch[1] !== "up") continue;

    const addrMatches = [...block.matchAll(/addr="([^"]+)"[^>]*addrtype="([^"]+)"/g)];
    let ip = null, mac = null;
    for (const m of addrMatches) {
      if (m[2] === "ipv4" || m[2] === "ipv6") ip = ip || m[1];
      if (m[2] === "mac") mac = m[1];
    }
    const vendorMatch   = block.match(/addrtype="mac"[^/]*vendor="([^"]+)"/);
    const osClassMatch  = block.match(/<osclass[^>]*osfamily="([^"]+)"[^>]*osgen="([^"]+)"/);
    const osSimple      = block.match(/<osclass[^>]*osfamily="([^"]+)"/);
    const hostnameM     = block.match(/<hostname[^>]+name="([^"]+)"/);
    const uptimeM       = block.match(/<uptime seconds="(\d+)"/);

    const ports = [];
    for (const pb of block.match(/<port[\s\S]*?<\/port>/g) || []) {
      ports.push({
        port:     parseInt((pb.match(/portid="(\d+)"/) || [])[1] || 0),
        protocol: (pb.match(/protocol="([^"]+)"/) || [])[1] || "tcp",
        state:    (pb.match(/<state[^>]+state="([^"]+)"/) || [])[1] || "unknown",
        service:  (pb.match(/name="([^"]+)"/) || [])[1] || "",
        product:  (pb.match(/product="([^"]+)"/) || [])[1] || "",
        version:  (pb.match(/ version="([^"]+)"/) || [])[1] || "",
        extra:    (pb.match(/extrainfo="([^"]+)"/) || [])[1] || "",
      });
    }

    const scripts = [];
    for (const sb of block.match(/<script[^>]+>/g) || []) {
      const id = (sb.match(/id="([^"]+)"/) || [])[1];
      const out= (sb.match(/output="([^"]+)"/) || [])[1];
      if (id && out) scripts.push({ id, output: out });
    }

    if (ip) {
      const hostObj = {
        ip, mac, vendor: vendorMatch?.[1] || null,
        os: osClassMatch ? `${osClassMatch[1]} ${osClassMatch[2]}` : osSimple?.[1] || "Unknown",
        hostname: hostnameM?.[1] || null,
        state: "up",
        uptimeSec: uptimeM ? parseInt(uptimeM[1]) : null,
        ports, scripts,
      };
      const risk = scoreHost(hostObj);
      hostObj.riskScore = risk.score;
      hostObj.riskLevel = risk.level;
      hosts.push(hostObj);
    }
  }
  return hosts;
}

function parseScanMeta(xml) {
  return {
    elapsed:    parseFloat((xml.match(/elapsed="([^"]+)"/) || [])[1] || 0),
    hostsUp:    parseInt((xml.match(/hosts up="(\d+)"/) || [])[1] || 0),
    hostsTotal: parseInt((xml.match(/total="(\d+)"/) || [])[1] || 0),
    args:       (xml.match(/args="([^"]+)"/) || [])[1] || null,
  };
}

// ─── WebSocket clients registry ───────────────────────────────────────────────
const clients = new Set();
wss.on("connection", (ws) => {
  clients.add(ws);
  ws.on("close", () => clients.delete(ws));
});

function broadcast(type, data) {
  const msg = JSON.stringify({ type, ...data });
  for (const ws of clients) {
    if (ws.readyState === 1) ws.send(msg);
  }
}

// ─── Run nmap with live streaming ─────────────────────────────────────────────
function runNmapStreaming(target, ports, flags, timeoutMs, scanId) {
  return new Promise((resolve, reject) => {
    const args = [...flags];
    const isQuick = flags.includes("-sn");
    if (!isQuick) args.push("-p", ports);
    args.push("--open", "-oX", "-", target);

    broadcast("log", { scanId, level: "cmd", text: `${NMAP_BIN} ${args.join(" ")}` });

    const proc = spawn(NMAP_BIN, args, { windowsHide: true });
    let xml = "", errBuf = "", killed = false;

    const timer = setTimeout(() => {
      killed = true; proc.kill();
      reject(new Error(`Timed out after ${timeoutMs / 1000}s`));
    }, timeoutMs);

    // Stream stderr as live log lines
    proc.stderr.on("data", chunk => {
      errBuf += chunk.toString();
      const lines = errBuf.split(/\r?\n/);
      errBuf = lines.pop();
      for (const line of lines) {
        if (line.trim()) broadcast("log", { scanId, level: "progress", text: line });
      }
    });

    proc.stdout.on("data", chunk => { xml += chunk.toString(); });

    proc.on("close", code => {
      clearTimeout(timer);
      if (killed) return;
      if (code !== 0 && !xml.includes("<nmaprun")) {
        const msg = errBuf.trim() || `nmap exited with code ${code}`;
        if (msg.includes("not found") || msg.includes("ENOENT") || code === 127)
          return reject(new Error(`nmap not found at "${NMAP_BIN}". Install from https://nmap.org`));
        if (msg.includes("permitted") || msg.includes("requires root") || msg.includes("rawsock") || msg.includes("Npcap"))
          return reject(new Error("Permission denied. Run as Administrator (Windows) or sudo (Linux)."));
        return reject(new Error(msg));
      }
      resolve(xml);
    });

    proc.on("error", err => {
      clearTimeout(timer);
      reject(err.code === "ENOENT"
        ? new Error(`nmap not found at "${NMAP_BIN}". Install from https://nmap.org`)
        : err);
    });
  });
}

// ─── POST /api/scan ─────────────────────────────────────────────────────────────
app.post("/api/scan", async (req, res) => {
  const { target, ports = "1-1000", scanType = "standard", timeout = 300 } = req.body;
  if (!target?.trim()) return res.status(400).json({ error: "Target is required" });

  const flagMap = {
    quick:    ["-sn"],
    standard: ["-sV", "--version-intensity", "5"],
    intense:  ["-sV", "--version-intensity", "9", "-O", "--osscan-guess", "-sC"],
    stealth:  ["-sS", "-sV", "--version-intensity", "5"],
    udp:      ["-sU", "-sV", "--version-intensity", "5"],
  };

  const scanId = Date.now().toString();
  broadcast("log", { scanId, level: "info", text: `Scan started: ${target} [${scanType}]` });

  try {
    const xml   = await runNmapStreaming(target.trim(), ports, flagMap[scanType] || flagMap.standard, timeout * 1000, scanId);
    const hosts = parseNmapXml(xml);
    const meta  = parseScanMeta(xml);
    broadcast("log", { scanId, level: "success", text: `Done — ${hosts.length} host(s) found in ${meta.elapsed}s` });
    broadcast("scanComplete", { scanId });
    res.json({ target: target.trim(), scanType, ports, timestamp: new Date().toISOString(), hosts, meta, scanId });
  } catch (err) {
    broadcast("log", { scanId, level: "error", text: err.message });
    broadcast("scanError", { scanId, error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// ─── CVE lookup ───────────────────────────────────────────────────────────────
app.post("/api/cve", async (req, res) => {
  const { service, product, version } = req.body;
  const keyword = [product, version].filter(Boolean).join(" ").trim() || service;
  if (!keyword) return res.status(400).json({ error: "Provide service, product, or version" });

  const query = encodeURIComponent(keyword);
  const url   = `https://services.nvd.nist.gov/rest/json/cves/2.0?keywordSearch=${query}&resultsPerPage=8`;

  const doFetch = () => new Promise((resolve, reject) => {
    const req2 = https.get(url, { headers: { "User-Agent": "GhostMap/2.0" } }, r => {
      let data = "";
      r.on("data", c => data += c);
      r.on("end", () => {
        try {
          const p = JSON.parse(data);
          resolve((p.vulnerabilities || []).map(v => {
            const c31 = v.cve.metrics?.cvssMetricV31?.[0];
            const c2  = v.cve.metrics?.cvssMetricV2?.[0];
            return {
              id: v.cve.id,
              description: v.cve.descriptions?.find(d => d.lang === "en")?.value || "",
              severity: c31?.cvssData?.baseSeverity || c2?.baseSeverity || "UNKNOWN",
              score:    c31?.cvssData?.baseScore    || c2?.cvssData?.baseScore || 0,
              vector:   c31?.cvssData?.vectorString || "",
              published: v.cve.published,
              url: `https://nvd.nist.gov/vuln/detail/${v.cve.id}`,
            };
          }));
        } catch(e) { reject(e); }
      });
    });
    req2.on("error", reject);
    req2.setTimeout(15000, () => { req2.destroy(); reject(new Error("NVD timeout")); });
  });

  try { res.json({ keyword, cves: await doFetch() }); }
  catch (err) { res.status(502).json({ error: err.message }); }
});

// ─── GET /api/health ──────────────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  exec(`"${NMAP_BIN}" --version`, (err, stdout) => {
    res.json({
      status: "ok", nmapInstalled: !err, nmapBin: NMAP_BIN,
      nmapVersion: err ? null : stdout.split("\n")[0].trim(),
      timestamp: new Date().toISOString(), platform: process.platform,
    });
  });
});

// ─── GET /api/version ─────────────────────────────────────────────────────────
app.get("/api/version", (_req, res) => {
  const root = path.join(__dirname, "..");
  exec("git describe --tags --always --dirty", { cwd: root }, (e, ver) => {
    exec("git log -1 --format=%cd --date=short", { cwd: root }, (e2, date) => {
      res.json({
        version: (ver || "local").trim(), date: (date || "").trim(),
        platform: process.platform, nodeVersion: process.version, nmapBin: NMAP_BIN,
      });
    });
  });
});

// ─── POST /api/update ─────────────────────────────────────────────────────────
app.post("/api/update", (_req, res) => {
  const root = path.join(__dirname, "..");
  const run  = (cmd, cwd) => new Promise(resolve => {
    exec(cmd, { cwd, timeout: 120_000 }, (err, out, se) => {
      const text = (out + se).trim();
      resolve({ ok: !err || text.includes("up to date") || text.includes("Already"), out: text, err: err?.message });
    });
  });
  (async () => {
    const steps = [];
    steps.push({ step: "git pull",          ...(await run("git pull --ff-only", root)) });
    steps.push({ step: "npm install server", ...(await run("npm install",        __dirname)) });
    steps.push({ step: "npm install client", ...(await run("npm install",        path.join(root, "client"))) });
    res.json({
      success: steps.every(s => s.ok), steps,
      message: steps.every(s => s.ok)
        ? "Update complete — restart the server to apply changes."
        : "Finished with errors — check steps.",
    });
  })();
});

// ─── GET /api/nmap-path ───────────────────────────────────────────────────────
app.get("/api/nmap-path", (_req, res) => res.json({ path: NMAP_BIN }));

// Serve Static Frontend Build in Production
const clientDistPath = path.join(__dirname, "..", "client", "dist");
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api") || req.path === "/ws") {
      return next();
    }
    res.sendFile(path.join(clientDistPath, "index.html"));
  });
}

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 GhostMap Server  →  http://localhost:${PORT}`);
  console.log(`   WebSocket        →  ws://localhost:${PORT}/ws`);
  console.log(`   Health           →  http://localhost:${PORT}/api/health\n`);
});
