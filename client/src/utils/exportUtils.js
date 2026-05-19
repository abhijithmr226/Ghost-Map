import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const RISK_COLORS = {
  CRITICAL: [255, 51,  102],
  HIGH:     [255, 107,  0],
  MEDIUM:   [255, 200,  0],
  LOW:      [0,   255, 136],
};

function riskColor(level) { return RISK_COLORS[level] || [100, 150, 200]; }

export function exportJSON(result) {
  const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `ghostmap-${result.target}-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportPDF(result) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const w = doc.internal.pageSize.getWidth();
  const now = new Date(result.timestamp).toLocaleString();

  // ── Background ──────────────────────────────────────────────
  doc.setFillColor(2, 11, 24);
  doc.rect(0, 0, w, doc.internal.pageSize.getHeight(), "F");

  // ── Header ──────────────────────────────────────────────────
  doc.setFillColor(0, 40, 70);
  doc.rect(0, 0, w, 22, "F");
  doc.setTextColor(0, 245, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("GHOSTMAP", 12, 14);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(180, 210, 240);
  doc.text("Network Recon Dashboard — Scan Report", 12, 20);
  doc.setTextColor(100, 150, 200);
  doc.text(`Generated: ${now}`, w - 12, 14, { align: "right" });
  doc.text(`Target: ${result.target}   Scan type: ${result.scanType}   Ports: ${result.ports}`, w - 12, 20, { align: "right" });

  let y = 30;

  // ── Summary cards ─────────────────────────────────────────
  const openPorts = result.hosts.reduce((a, h) => a + h.ports.filter(p => p.state === "open").length, 0);
  const critHosts = result.hosts.filter(h => h.riskLevel === "CRITICAL").length;
  const highHosts = result.hosts.filter(h => h.riskLevel === "HIGH").length;
  const summaryCards = [
    { label: "HOSTS UP",       value: result.hosts.length, color: [0, 245, 255] },
    { label: "OPEN PORTS",     value: openPorts,           color: [0, 255, 136] },
    { label: "CRITICAL HOSTS", value: critHosts,           color: [255, 51, 102] },
    { label: "HIGH RISK",      value: highHosts,           color: [255, 107, 0]  },
    { label: "ELAPSED",        value: result.meta?.elapsed ? `${result.meta.elapsed}s` : "—", color: [168, 85, 247] },
  ];

  const cardW = (w - 24) / summaryCards.length;
  summaryCards.forEach((card, i) => {
    const x = 12 + i * cardW;
    doc.setFillColor(5, 20, 40);
    doc.roundedRect(x, y, cardW - 3, 18, 2, 2, "F");
    doc.setDrawColor(...card.color);
    doc.setLineWidth(0.4);
    doc.roundedRect(x, y, cardW - 3, 18, 2, 2, "S");
    doc.setTextColor(100, 140, 180);
    doc.setFontSize(7);
    doc.text(card.label, x + (cardW - 3) / 2, y + 6, { align: "center" });
    doc.setTextColor(...card.color);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(String(card.value), x + (cardW - 3) / 2, y + 14, { align: "center" });
    doc.setFont("helvetica", "normal");
  });
  y += 24;

  // ── Per-host tables ─────────────────────────────────────────
  for (const host of result.hosts) {
    if (y > doc.internal.pageSize.getHeight() - 40) {
      doc.addPage();
      doc.setFillColor(2, 11, 24);
      doc.rect(0, 0, w, doc.internal.pageSize.getHeight(), "F");
      y = 12;
    }

    // Host header bar
    const rc = riskColor(host.riskLevel);
    doc.setFillColor(5, 20, 40);
    doc.roundedRect(12, y, w - 24, 10, 1, 1, "F");
    doc.setFillColor(...rc);
    doc.roundedRect(12, y, 3, 10, 0, 0, "F");

    doc.setTextColor(0, 245, 255);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(host.ip, 18, y + 7);

    doc.setTextColor(180, 210, 240);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    const meta = [host.hostname, host.os, host.vendor].filter(Boolean).join("  ·  ");
    doc.text(meta, 60, y + 7);

    // Risk badge
    doc.setFillColor(...rc);
    doc.roundedRect(w - 45, y + 1.5, 22, 7, 1, 1, "F");
    doc.setTextColor(2, 11, 24);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text(host.riskLevel, w - 34, y + 6.5, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setTextColor(180, 210, 240);
    doc.text(`Score: ${host.riskScore}`, w - 20, y + 6.5);

    y += 12;

    const openPorts = host.ports.filter(p => p.state === "open");
    if (openPorts.length === 0) {
      doc.setTextColor(100, 140, 180);
      doc.setFontSize(8);
      doc.text("  No open ports found", 14, y + 5);
      y += 10;
      continue;
    }

    autoTable(doc, {
      startY: y,
      margin: { left: 12, right: 12 },
      head: [["PORT", "PROTOCOL", "SERVICE", "PRODUCT", "VERSION"]],
      body: openPorts.map(p => [p.port, p.protocol, p.service, p.product, p.version]),
      styles: {
        fontSize: 8,
        cellPadding: 2,
        textColor: [180, 210, 240],
        fillColor: [5, 20, 40],
        lineColor: [20, 50, 80],
        lineWidth: 0.2,
      },
      headStyles: {
        fillColor: [0, 40, 70],
        textColor: [0, 245, 255],
        fontSize: 7.5,
        fontStyle: "bold",
      },
      alternateRowStyles: { fillColor: [8, 25, 48] },
      columnStyles: {
        0: { cellWidth: 18, textColor: [0, 245, 255], fontStyle: "bold" },
        1: { cellWidth: 22 },
        2: { cellWidth: 30 },
        3: { cellWidth: 50 },
        4: { cellWidth: 40 },
      },
      didDrawPage: (data) => {
        doc.setFillColor(2, 11, 24);
        doc.rect(0, 0, w, doc.internal.pageSize.getHeight(), "F");
      },
    });

    y = doc.lastAutoTable.finalY + 8;
  }

  // ── Footer ──────────────────────────────────────────────────
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFillColor(0, 25, 50);
    doc.rect(0, doc.internal.pageSize.getHeight() - 8, w, 8, "F");
    doc.setTextColor(50, 100, 150);
    doc.setFontSize(7);
    doc.text("GhostMap — Network Recon Dashboard", 12, doc.internal.pageSize.getHeight() - 2.5);
    doc.text(`Page ${i} of ${pageCount}`, w - 12, doc.internal.pageSize.getHeight() - 2.5, { align: "right" });
  }

  doc.save(`ghostmap-${result.target}-${Date.now()}.pdf`);
}
