/**
 * YOUR LIFE — Home Page
 * Design: Neon Depth (dark ambient, electric blue line, glowing nodes)
 * Fonts: Space Grotesk (display/body) + Space Mono (timestamps/labels)
 *
 * Logic:
 *  - X axis = 5-day rolling window (always shows last 5 days)
 *  - Y axis = elevation (starts at 0, +1 per submission, -1 per day passed)
 *  - Each node is labeled with the user's input text
 *  - Moment count = total submissions (not affected by day decay)
 *  - Data persists in localStorage
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { VariableFontHoverByLetter } from "@/components/ui/variable-font-hover-by-letter";

// ─── Types ────────────────────────────────────────────────────────────────────

interface LifePoint {
  id: string;
  timestamp: number; // ms since epoch
  elevation: number;
  label: string;
  dateCreated: string; // YYYY-MM-DD for tracking day-based decrements
}

// ─── Constants ────────────────────────────────────────────────────────────────

// Generate or retrieve device ID
function getDeviceId(): string {
  const key = "your-life-device-id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = `device-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    localStorage.setItem(key, id);
  }
  return id;
}

const DEVICE_ID = getDeviceId();
const STORAGE_KEY = `your-life-points-${DEVICE_ID}`;
const VIEWBOX_W = 900;
const VIEWBOX_H = 420;
const PAD_LEFT = 72;
const PAD_RIGHT = 40;
const PAD_TOP = 56;
const PAD_BOTTOM = 56;
const CHART_W = VIEWBOX_W - PAD_LEFT - PAD_RIGHT;
const CHART_H = VIEWBOX_H - PAD_TOP - PAD_BOTTOM;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(ts: number): string {
  const d = new Date(ts);
  const h = d.getHours().toString().padStart(2, "0");
  const m = d.getMinutes().toString().padStart(2, "0");
  const s = d.getSeconds().toString().padStart(2, "0");
  return `${h}:${m}:${s}`;
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatDateFull(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function getDateString(ts: number): string {
  const d = new Date(ts);
  return d.toISOString().split("T")[0];
}

function getDaysPassed(dateCreated: string, nowDate: string): number {
  const created = new Date(dateCreated);
  const now = new Date(nowDate);
  return Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
}

function loadPoints(): LifePoint[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as LifePoint[];
  } catch {}
  return [];
}

function savePoints(pts: LifePoint[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(pts));
}

// ─── Chart math ──────────────────────────────────────────────────────────────

function getScales(points: LifePoint[], nowTs: number, nowDate: string, padBottom: number = PAD_BOTTOM) {
  const chartHeight = VIEWBOX_H - PAD_TOP - padBottom;
  // X-axis shows real-time: from earliest point to now
  if (points.length === 0) {
    const start = nowTs - 60_000;
    return {
      xMin: start,
      xMax: nowTs,
      yMin: 0,
      yMax: 5,
      toX: (ts: number) => PAD_LEFT + ((ts - start) / (nowTs - start)) * CHART_W,
      toY: (el: number) => PAD_TOP + (1 - el / 5) * chartHeight,
      chartHeight,
    };
  }

  const xMin = points[0].timestamp;
  const xMax = Math.max(nowTs, points[points.length - 1].timestamp + 1);

  // Calculate adjusted elevations based on days passed
  const adjustedPoints = points.map((p) => {
    const daysPassed = getDaysPassed(p.dateCreated, nowDate);
    const adjustedEl = Math.max(0, p.elevation - daysPassed);
    return adjustedEl;
  });

  const maxEl = adjustedPoints.length > 0 ? Math.max(...adjustedPoints) : 0;
  const yMax = Math.max(maxEl + 2, 5);
  const yMin = 0;

  const xRange = xMax - xMin || 1;
  const yRange = yMax - yMin || 1;

  return {
    xMin,
    xMax,
    yMin,
    yMax,
    toX: (ts: number) => PAD_LEFT + ((ts - xMin) / xRange) * CHART_W,
    toY: (el: number) => PAD_TOP + (1 - (el - yMin) / yRange) * chartHeight,
    chartHeight,
  };
}

function buildLinePath(points: LifePoint[], toX: (t: number) => number, toY: (e: number) => number): string {
  if (points.length === 0) return "";
  if (points.length === 1) {
    const x = toX(points[0].timestamp);
    const y = toY(points[0].elevation);
    return `M ${x},${y}`;
  }
  let d = `M ${toX(points[0].timestamp)},${toY(points[0].elevation)}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const px = toX(prev.timestamp), py = toY(prev.elevation);
    const cx = toX(curr.timestamp), cy = toY(curr.elevation);
    const cpx = px + (cx - px) * 0.55;
    d += ` C ${cpx},${py} ${cpx},${cy} ${cx},${cy}`;
  }
  return d;
}

function buildAreaPath(points: LifePoint[], toX: (t: number) => number, toY: (e: number) => number, chartHeight: number = CHART_H): string {
  if (points.length < 2) return "";
  const line = buildLinePath(points, toX, toY);
  const lastX = toX(points[points.length - 1].timestamp);
  const firstX = toX(points[0].timestamp);
  const baseY = PAD_TOP + chartHeight;
  return `${line} L ${lastX},${baseY} L ${firstX},${baseY} Z`;
}

// ─── Y-axis ticks ─────────────────────────────────────────────────────────────

function yTicks(yMin: number, yMax: number, count = 5): number[] {
  const step = Math.ceil((yMax - yMin) / count);
  const ticks: number[] = [];
  for (let v = yMin; v <= yMax; v += step) ticks.push(v);
  return ticks;
}

// ─── X-axis ticks ─────────────────────────────────────────────────────────────

function xTicks(xMin: number, xMax: number, count = 5): number[] {
  const step = (xMax - xMin) / (count - 1);
  return Array.from({ length: count }, (_, i) => Math.round(xMin + i * step));
}

// Find day boundaries within the time range
function getDayBoundaries(xMin: number, xMax: number): number[] {
  const boundaries: number[] = [];
  const startDate = new Date(xMin);
  startDate.setHours(0, 0, 0, 0);
  
  let current = startDate.getTime();
  while (current <= xMax) {
    if (current >= xMin) {
      boundaries.push(current);
    }
    current += 24 * 60 * 60 * 1000; // Add 1 day
  }
  
  return boundaries;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function Home() {
  const [points, setPoints] = useState<LifePoint[]>(loadPoints);
  const [input, setInput] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [newNodeId, setNewNodeId] = useState<string | null>(null);
  const [lineKey, setLineKey] = useState(0);
  const [tooltip, setTooltip] = useState<{ point: LifePoint; x: number; y: number; adjustedEl: number } | null>(null);
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.innerWidth < 768);
  const inputRef = useRef<HTMLInputElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const nowDate = getDateString(now);

  // Detect screen size changes
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Responsive padding: extend y-axis on mobile (much smaller on mobile to reach near input)
  const PAD_BOTTOM_RESPONSIVE = isMobile ? 8 : 56;

  // Live clock — update every second
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const scales = getScales(points, now, nowDate, PAD_BOTTOM_RESPONSIVE);
  const { toX, toY, xMin, xMax, yMin, yMax, chartHeight } = scales;

  // Build adjusted points for rendering (with day-based decrements)
  const adjustedPoints = points.map((p) => {
    const daysPassed = getDaysPassed(p.dateCreated, nowDate);
    const adjustedEl = Math.max(0, p.elevation - daysPassed);
    return { ...p, adjustedEl };
  });

  const linePath = buildLinePath(
    adjustedPoints.map((p) => ({ ...p, elevation: p.adjustedEl })),
    toX,
    toY
  );
  const areaPath = buildAreaPath(
    adjustedPoints.map((p) => ({ ...p, elevation: p.adjustedEl })),
    toX,
    toY,
    chartHeight
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = input.trim();
      if (!trimmed) return;

      const newElevation = (points[points.length - 1]?.elevation ?? 0) + 1;
      // Use a combination of timestamp, random, and counter to ensure absolute uniqueness
      const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}-${points.length}`;
      const newPoint: LifePoint = {
        id: uniqueId,
        timestamp: Date.now(),
        elevation: newElevation,
        label: trimmed,
        dateCreated: getDateString(Date.now()),
      };

      const updated = [...points, newPoint];
      setPoints(updated);
      savePoints(updated);
      setInput("");
      setNewNodeId(newPoint.id);
      setLineKey((k) => k + 1);

      setTimeout(() => setNewNodeId(null), 1200);
      inputRef.current?.focus();
    },
    [input, points]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSubmit(e as unknown as React.FormEvent);
  };

  const handleClear = () => {
    if (window.confirm("Clear all life data and start fresh?")) {
      setPoints([]);
      savePoints([]);
      setLineKey((k) => k + 1);
    }
  };

  const yTickVals = yTicks(yMin, yMax);
  const xTickVals = xTicks(xMin, xMax, Math.min(6, Math.max(3, points.length + 1)));

  // Current elevation (adjusted for days passed)
  const currentElevation = adjustedPoints[adjustedPoints.length - 1]?.adjustedEl ?? 0;

  // Days passed (for moment count increment)
  const daysPassed = points.length > 0 ? getDaysPassed(points[0].dateCreated, nowDate) : 0;
  const momentCount = points.length + daysPassed;

  // Live cursor X position (guard against NaN)
  const liveX = isFinite(toX(now)) ? toX(now) : 0;
  const liveY = isFinite(toY(currentElevation)) ? toY(currentElevation) : 0;

  return (
    <div className="min-h-screen bg-background flex flex-col" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
      {/* ── Header ── */}
      <header className="px-4 md:px-8 pt-6 md:pt-8 pb-3 md:pb-4 flex flex-col md:flex-row md:items-start md:justify-between gap-4 md:gap-0">
        <div className="flex-1">
          <h1
            className="text-3xl md:text-5xl font-semibold tracking-tight"
            style={{ letterSpacing: "-0.02em" }}
          >
            <VariableFontHoverByLetter
              label="Your Life"
              className="inline-block"
              fromFontVariationSettings="'wght' 400"
              toFontVariationSettings="'wght' 700"
              staggerDuration={0.04}
              transition={{ type: "spring", duration: 0.6 }}
              staggerFrom="first"
            />
          </h1>
          <p className="mt-1 text-xs md:text-sm" style={{ color: "rgba(240,244,255,0.45)", fontFamily: "'Space Mono', monospace" }}>
            elevation over time · {formatDate(now)} · {formatTime(now)}
          </p>
        </div>

        <div className="flex items-center gap-3 md:gap-6 md:text-right">
          <div className="text-center md:text-right">
            <div className="text-xs" style={{ color: "rgba(240,244,255,0.4)", fontFamily: "'Space Mono', monospace" }}>
              ELEVATION
            </div>
            <div
              className="text-2xl md:text-3xl font-semibold tabular-nums"
              style={{ textShadow: "0 0 20px rgba(167,139,250,0.6)" }}
            >
              <span style={{ color: "#a78bfa" }}>
                <VariableFontHoverByLetter
                  label={Math.round(currentElevation).toString()}
                  fromFontVariationSettings="'wght' 400"
                  toFontVariationSettings="'wght' 700"
                  staggerDuration={0.05}
                  transition={{ type: "spring", duration: 0.5 }}
                  staggerFrom="center"
                />
              </span>
            </div>
          </div>
          <div className="text-center md:text-right">
            <div className="text-xs" style={{ color: "rgba(240,244,255,0.4)", fontFamily: "'Space Mono', monospace" }}>
              MOMENTS
            </div>
            <div
              className="text-2xl md:text-3xl font-semibold tabular-nums"
              style={{ textShadow: "0 0 20px rgba(79,195,247,0.6)" }}
            >
              <span style={{ color: "#4fc3f7" }}>
                <VariableFontHoverByLetter
                  label={momentCount.toString()}
                  fromFontVariationSettings="'wght' 400"
                  toFontVariationSettings="'wght' 700"
                  staggerDuration={0.05}
                  transition={{ type: "spring", duration: 0.5 }}
                  staggerFrom="center"
                />
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* ── Chart ── */}
      <main className="flex-1 px-3 md:px-8 pb-3 md:pb-4">
        <div
          className="relative w-full rounded-lg md:rounded-xl overflow-hidden"
          style={{
            background: "linear-gradient(180deg, rgba(10,16,28,0.95) 0%, rgba(6,10,20,0.98) 100%)",
            border: "1px solid rgba(79,195,247,0.12)",
            boxShadow: "0 0 40px rgba(79,195,247,0.05), inset 0 1px 0 rgba(255,255,255,0.04)",
            aspectRatio: "900 / 420",
          }}
        >
          <svg
            ref={svgRef}
            viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
            className="w-full h-full"
            style={{ display: "block" }}
            onMouseLeave={() => setTooltip(null)}
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              {/* Glow filter for line */}
              <filter id="line-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
              {/* Glow filter for nodes */}
              <filter id="node-glow" x="-60%" y="-60%" width="220%" height="220%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
              {/* Area gradient */}
              <linearGradient id="area-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4fc3f7" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#4fc3f7" stopOpacity="0" />
              </linearGradient>
              {/* Live cursor gradient */}
              <linearGradient id="cursor-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00e5b0" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#00e5b0" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* ── Grid lines ── */}
            {yTickVals.map((v, i) => {
              const y = toY(v);
              return (
                <line
                  key={`grid-${i}`}
                  x1={PAD_LEFT}
                  y1={y}
                  x2={VIEWBOX_W - PAD_RIGHT}
                  y2={y}
                  stroke="rgba(240,244,255,0.05)"
                  strokeWidth="1"
                />
              );
            })}

            {/* ── Y-axis labels ── */}
            {yTickVals.map((v, i) => {
              const yPos = toY(v) + 4;
              return isFinite(yPos) ? (
                <text
                  key={`label-${i}`}
                  x={PAD_LEFT - 10}
                  y={yPos}
                  textAnchor="end"
                  fontSize="11"
                  fill="rgba(240,244,255,0.35)"
                  fontFamily="'Space Mono', monospace"
                >
                  {v}
                </text>
              ) : null;
            })}

            {/* ── X-axis labels ── */}
            {xTickVals.map((ts) => {
              const x = toX(ts);
              return isFinite(x) ? (
                <text
                  key={ts}
                  x={x}
                  y={PAD_TOP + chartHeight + 22}
                  textAnchor="middle"
                  fontSize="10"
                  fill="rgba(240,244,255,0.3)"
                  fontFamily="'Space Mono', monospace"
                >
                  {formatTime(ts)}
                </text>
              ) : null;
            })}

            {/* ── Day boundary labels (date) ── */}
            {getDayBoundaries(xMin, xMax).map((dayTs) => {
              const x = isFinite(toX(dayTs)) ? toX(dayTs) : 0;
              return isFinite(x) && x >= PAD_LEFT && x <= VIEWBOX_W - PAD_RIGHT ? (
                <g key={`day-${dayTs}`}>
                  <line
                    x1={x}
                    y1={PAD_TOP}
                    x2={x}
                    y2={PAD_TOP + chartHeight}
                    stroke="rgba(79,195,247,0.08)"
                    strokeWidth="1"
                    strokeDasharray="2 3"
                  />
                  <text
                    x={x}
                    y={PAD_TOP + chartHeight + 40}
                    textAnchor="middle"
                    fontSize="9"
                    fill="rgba(240,244,255,0.25)"
                    fontFamily="'Space Mono', monospace"
                    fontWeight="500"
                  >
                    {formatDateFull(dayTs)}
                  </text>
                </g>
              ) : null;
            })}

            {/* ── Axis lines ── */}
            <line
              x1={PAD_LEFT}
              y1={PAD_TOP}
              x2={PAD_LEFT}
              y2={PAD_TOP + chartHeight}
              stroke="rgba(240,244,255,0.1)"
              strokeWidth="1"
            />
            <line
              x1={PAD_LEFT}
              y1={PAD_TOP + chartHeight}
              x2={VIEWBOX_W - PAD_RIGHT}
              y2={PAD_TOP + chartHeight}
              stroke="rgba(240,244,255,0.1)"
              strokeWidth="1"
            />

            {/* ── Area fill ── */}
            {areaPath && (
              <path d={areaPath} fill="url(#area-grad)" />
            )}

            {/* ── Life line ── */}
            {linePath && (
              <path
                key={`line-${lineKey}`}
                d={linePath}
                fill="none"
                stroke="#4fc3f7"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#line-glow)"
                style={{
                  strokeDasharray: 3000,
                  strokeDashoffset: 0,
                  animation: `line-draw 0.8s cubic-bezier(0.4,0,0.2,1) forwards`,
                }}
              />
            )}

            {/* ── Live cursor vertical line ── */}
            {points.length > 0 && liveX >= PAD_LEFT && liveX <= VIEWBOX_W - PAD_RIGHT && isFinite(liveX) && isFinite(liveY) && (
              <>
                <line
                  x1={liveX}
                  y1={PAD_TOP}
                  x2={liveX}
                  y2={PAD_TOP + chartHeight}
                  stroke="rgba(0,229,176,0.2)"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                {/* Live dot at current elevation */}
                <circle
                  cx={liveX}
                  cy={liveY}
                  r="4"
                  fill="#00e5b0"
                  opacity="0.7"
                  filter="url(#node-glow)"
                />
              </>
            )}

            {/* ── Data nodes ── */}
            {adjustedPoints.map((apt, i) => {
              const pt = points[i];
              const x = isFinite(toX(apt.timestamp)) ? toX(apt.timestamp) : 0;
              const y = isFinite(toY(apt.adjustedEl)) ? toY(apt.adjustedEl) : 0;
              const isNew = pt.id === newNodeId;
              const isLast = i === points.length - 1;

              // Label position: alternate above/below to avoid overlap
              const labelAbove = true;
              const labelY = labelAbove ? y - 16 : y + 24;

              return (
                <g
                  key={pt.id}
                  onMouseEnter={() => isFinite(x) && isFinite(y) && setTooltip({ point: pt, x, y, adjustedEl: apt.adjustedEl })}
                  onMouseLeave={() => setTooltip(null)}
                  style={{ cursor: "pointer" }}
                >
                  {/* Pulse ring for latest node */}
                  {isLast && isFinite(x) && isFinite(y) && (
                    <circle
                      cx={x}
                      cy={y}
                      r="8"
                      fill="none"
                      stroke="#a78bfa"
                      strokeWidth="1.5"
                      opacity="0.6"
                      className="pulse-ring"
                    />
                  )}

                  {/* Node dot */}
                  {isFinite(x) && isFinite(y) && (
                    <>
                      <circle
                        cx={x}
                        cy={y}
                        r="5"
                        fill="#a78bfa"
                        filter="url(#node-glow)"
                        className={isNew ? "node-enter" : ""}
                        style={isNew ? { transformOrigin: `${x}px ${y}px` } : undefined}
                      />
                      <circle cx={x} cy={y} r="2.5" fill="#f0f4ff" />
                    </>
                  )}

                  {/* Label */}
                  {isFinite(x) && isFinite(labelY) && (
                    <text
                      x={x}
                      y={labelY}
                      textAnchor="middle"
                      fontSize="10"
                      fill="rgba(240,244,255,0.75)"
                      fontFamily="'Space Grotesk', sans-serif"
                      fontWeight="500"
                      className={isNew ? "label-up" : ""}
                      style={{
                        maxWidth: "80px",
                        pointerEvents: "none",
                      }}
                    >
                      {pt.label.length > 18 ? pt.label.slice(0, 16) + "…" : pt.label}
                    </text>
                  )}
                </g>
              );
            })}

            {/* ── Tooltip ── */}
            {tooltip && (() => {
              const { point, x, y, adjustedEl } = tooltip;
              const boxW = 180;
              const boxH = 68;
              const bx = Math.min(x - boxW / 2, VIEWBOX_W - PAD_RIGHT - boxW);
              const by = y - boxH - 14;
              return (
                <g style={{ pointerEvents: "none" }}>
                  <rect
                    x={bx}
                    y={by}
                    width={boxW}
                    height={boxH}
                    rx="6"
                    fill="rgba(10,16,28,0.95)"
                    stroke="rgba(79,195,247,0.3)"
                    strokeWidth="1"
                  />
                  <text
                    x={bx + boxW / 2}
                    y={by + 16}
                    textAnchor="middle"
                    fontSize="10"
                    fill="#4fc3f7"
                    fontFamily="'Space Mono', monospace"
                  >
                    {formatTime(point.timestamp)}
                  </text>
                  <text
                    x={bx + boxW / 2}
                    y={by + 32}
                    textAnchor="middle"
                    fontSize="9"
                    fill="rgba(240,244,255,0.7)"
                    fontFamily="'Space Grotesk', sans-serif"
                  >
                    {point.label.length > 24 ? point.label.slice(0, 22) + "…" : point.label}
                  </text>
                  <text
                    x={bx + boxW / 2}
                    y={by + 50}
                    textAnchor="middle"
                    fontSize="9"
                    fill="#a78bfa"
                    fontFamily="'Space Mono', monospace"
                  >
                    el: {isFinite(adjustedEl) ? Math.round(adjustedEl) : "0"}
                  </text>
                </g>
              );
            })()}

            {/* ── Empty state ── */}
            {points.length === 0 && (
              <text
                x={VIEWBOX_W / 2}
                y={VIEWBOX_H / 2}
                textAnchor="middle"
                fontSize="14"
                fill="rgba(240,244,255,0.2)"
                fontFamily="'Space Grotesk', sans-serif"
                fontWeight="300"
              >
                Your story begins with the first entry below ↓
              </text>
            )}
          </svg>
        </div>
      </main>

      {/* ── Input ── */}
      <footer className="px-3 md:px-8 pb-6 md:pb-8 pt-2">
        <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-2 md:gap-3 items-stretch md:items-center max-w-3xl mx-auto">
          <div className="relative flex-1">
            <label
              htmlFor="life-input"
              className="block text-xs mb-1.5"
              style={{ fontFamily: "'Space Mono', monospace", letterSpacing: "0.08em" }}
            >
              <span style={{ color: "rgba(240,244,255,0.4)" }}>
                ANYTHING{" "}
              </span>
              <VariableFontHoverByLetter
                label="USEFUL"
                fromFontVariationSettings="'wght' 400"
                toFontVariationSettings="'wght' 700"
                staggerDuration={0.04}
                transition={{ type: "spring", duration: 0.5 }}
                staggerFrom="first"
              />
              <span style={{ color: "rgba(240,244,255,0.4)" }}>?</span>
            </label>
            <input
              id="life-input"
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type something meaningful…"
              autoComplete="off"
              className="w-full px-3 md:px-4 py-2 md:py-3 rounded-lg text-sm outline-none transition-all duration-200 input-glow"
              style={{
                background: "rgba(10,16,28,0.8)",
                border: "1px solid rgba(79,195,247,0.2)",
                color: "#f0f4ff",
                fontFamily: "'Space Grotesk', sans-serif",
                caretColor: "#00e5b0",
                fontSize: "14px",
              }}
            />
          </div>
          <div className="flex gap-2 md:gap-1 md:flex-col">
            <div className="text-xs opacity-0 mb-1.5 hidden md:block" aria-hidden>·</div>
            <button
              type="submit"
              disabled={!input.trim()}
              className="flex-1 md:flex-none px-4 md:px-5 py-2 md:py-3 rounded-lg text-sm font-semibold transition-all duration-200 disabled:opacity-30"
              style={{
                background: input.trim()
                  ? "linear-gradient(135deg, rgba(79,195,247,0.2) 0%, rgba(167,139,250,0.2) 100%)"
                  : "rgba(79,195,247,0.05)",
                border: "1px solid rgba(79,195,247,0.4)",
                color: "#4fc3f7",
                boxShadow: input.trim() ? "0 0 16px rgba(79,195,247,0.15)" : "none",
                fontFamily: "'Space Grotesk', sans-serif",
              }}
            >
              + Elevate
            </button>
          </div>
        </form>

        {/* Clear button */}
        {points.length > 0 && (
          <div className="flex justify-center mt-4">
            <button
              onClick={handleClear}
              className="text-xs transition-opacity duration-200 hover:opacity-80"
              style={{ color: "rgba(240,244,255,0.2)", fontFamily: "'Space Mono', monospace" }}
            >
              clear all data
            </button>
          </div>
        )}
      </footer>
    </div>
  );
}
