import { useState, useEffect, useRef } from "react";
import "../CorrectionsPage.css";
import AdminLayout from "../components/AdminLayout";

const BASE_URL   = "f7262e6d4d995a48.vercel-dns-017.com";

async function api(endpoint, body = {}) {
  try {
    const res = await fetch(`${BASE_URL}/api${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return { IsSuccess: false, Message: `HTTP ${res.status}` };
    return await res.json();
  } catch {
    return { IsSuccess: false, Message: "Network Error" };
  }
}

/* ─── Helpers ─── */
function imgFilename(raw) {
  if (!raw) return null;
  return raw.split("/").pop().split("\\").pop() || null;
}

const fmtTime = (secs) => {
  if (!secs) return "—";
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
};

const fmtDate = (d) => {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit", hour12: true,
    });
  } catch { return d; }
};

const isAudioUrl = (url) =>
  /\.(mp3|wav|webm|ogg|m4a)(\?.*)?$/i.test(url);

/* ─── Status Badge ─── */
function StatusBadge({ status }) {
  const map = {
    Submitted: { bg: "#fef9c3", color: "#a16207",  label: "⏳ Waiting for Review" },
    Approved:  { bg: "#dcfce7", color: "#15803d",  label: "✅ Approved"            },
    ReExam:    { bg: "#fee2e2", color: "#b91c1c",  label: "🔁 Re-Exam Required"    },
    Reviewed:  { bg: "#dbeafe", color: "#1d4ed8",  label: "🔍 Reviewed"            },
    Promoted:  { bg: "#f0fdf4", color: "#166534",  label: "🚀 Promoted"            },
  };
  const s = map[status] || { bg: "#f1f5f9", color: "#64748b", label: status || "—" };
  return (
    <span style={{
      background: s.bg, color: s.color,
      padding: "3px 10px", borderRadius: 20,
      fontSize: "0.75rem", fontWeight: 700,
      whiteSpace: "nowrap",
    }}>
      {s.label}
    </span>
  );
}

/* ─── Role Pill ─── */
function RolePill({ role }) {
  const map = {
    Support:        ["#dbeafe", "#1d4ed8"],
    Implementation: ["#fef9c3", "#a16207"],
    Sales:          ["#dcfce7", "#15803d"],
  };
  const [bg, color] = map[role] || ["#f1f5f9", "#64748b"];
  return (
    <span style={{
      background: bg, color,
      padding: "2px 10px", borderRadius: 20,
      fontSize: "0.72rem", fontWeight: 700,
    }}>
      {role || "—"}
    </span>
  );
}

/* ─── Answer Comparison Cell ─── */
function AnswerCell({ correct, employee, optionType }) {
  if (!employee) return <span style={{ color: "#94a3b8" }}>—</span>;

  // Manual answers are not auto-validated — reviewer decides
  if (optionType === "manual") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{ fontWeight: 700, color: "#0369a1", fontSize: "0.88rem" }}>
          📝 {employee}
        </span>
        <span style={{
          fontSize: "0.68rem", fontWeight: 700,
          color: "#0369a1", background: "#e0f2fe",
          padding: "1px 7px", borderRadius: 8, display: "inline-block", marginTop: 2,
        }}>
          Pending Review
        </span>
      </div>
    );
  }

  // MCQ — auto-validate by comparing against correct answer
  const isCorrect =
    String(correct).trim().toUpperCase() === String(employee).trim().toUpperCase();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={{
        fontWeight: 700,
        color: isCorrect ? "#15803d" : "#b91c1c",
        fontSize: "0.88rem",
      }}>
        {isCorrect ? "✅" : "❌"} {employee}
      </span>
      <span style={{ fontSize: "0.7rem", color: "#64748b" }}>
        Correct: <b style={{ color: "#15803d" }}>{correct || "—"}</b>
      </span>
    </div>
  );
}

/* ─── Image Zoom Modal ─── */
function ZoomModal({ url, onClose }) {
  if (!url) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.85)",
        display: "flex", alignItems: "center", justifyContent: "center",
        backdropFilter: "blur(8px)", cursor: "zoom-out",
      }}
    >
      <div onClick={e => e.stopPropagation()}
        style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
        <img src={url} alt="Zoomed" style={{
          maxWidth: "88vw", maxHeight: "80vh", borderRadius: 14,
          objectFit: "contain", background: "#fff",
          boxShadow: "0 12px 60px rgba(0,0,0,0.6)",
        }} />
        <button onClick={onClose} style={{
          padding: "9px 32px", borderRadius: 10, border: "none",
          background: "#fff", color: "#111", fontWeight: 700,
          fontSize: "0.85rem", cursor: "pointer",
        }}>✕ Close</button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   CUSTOM AUDIO PLAYER
══════════════════════════════════════════════ */
function CustomAudioPlayer({ src }) {
  const audioRef  = useRef(null);
  const [playing,   setPlaying]   = useState(false);
  const [current,   setCurrent]   = useState(0);
  const [duration,  setDuration]  = useState(0);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(false);

  const formatSec = (s) => {
    if (isNaN(s) || !isFinite(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${String(sec).padStart(2, "0")}`;
  };

  const progress = duration > 0 ? (current / duration) * 100 : 0;

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(() => setError(true));
    }
  };

  const handleSeek = (e) => {
    if (!audioRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audioRef.current.currentTime = ratio * duration;
    setCurrent(ratio * duration);
  };

  if (error) {
    return (
      <div style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "6px 10px", borderRadius: 8,
        background: "#fee2e2", border: "1.5px solid #fca5a5",
        fontSize: "0.72rem", color: "#b91c1c", fontWeight: 600,
        minWidth: 140,
      }}>
        ⚠️ Audio unavailable
      </div>
    );
  }

  return (
    <div style={{
      display: "flex", flexDirection: "column", gap: 6,
      background: "linear-gradient(135deg, #f0f4ff, #e8eeff)",
      border: "1.5px solid #c7d2fe",
      borderRadius: 12, padding: "10px 12px",
      minWidth: 200, maxWidth: 280,
    }}>
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onLoadedMetadata={() => { setDuration(audioRef.current?.duration || 0); setLoading(false); }}
        onTimeUpdate={() => setCurrent(audioRef.current?.currentTime || 0)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => { setPlaying(false); setCurrent(0); if (audioRef.current) audioRef.current.currentTime = 0; }}
        onError={() => { setError(true); setLoading(false); }}
      />

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button
          onClick={togglePlay}
          disabled={loading}
          style={{
            width: 34, height: 34, borderRadius: "50%",
            border: "none", cursor: loading ? "not-allowed" : "pointer",
            background: loading ? "#e2e8f0" : "linear-gradient(135deg, #6366f1, #4f46e5)",
            color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
            boxShadow: loading ? "none" : "0 2px 8px rgba(99,102,241,0.4)",
            transition: "all 0.15s",
          }}
          title={playing ? "Pause" : "Play"}
        >
          {loading ? (
            <div style={{
              width: 14, height: 14, borderRadius: "50%",
              border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff",
              animation: "cp-spin 0.7s linear infinite",
            }} />
          ) : playing ? (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5,3 19,12 5,21"/>
            </svg>
          )}
        </button>

        <span style={{
          fontSize: "0.68rem", fontWeight: 700, color: "#6366f1",
          fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap",
          minWidth: 56,
        }}>
          {formatSec(current)} / {formatSec(duration)}
        </span>
      </div>

      <div
        onClick={handleSeek}
        style={{
          height: 5, borderRadius: 10,
          background: "#ddd6fe", cursor: "pointer",
          position: "relative", overflow: "hidden",
        }}
        title="Seek"
      >
        <div style={{
          position: "absolute", top: 0, left: 0,
          height: "100%", borderRadius: 10,
          background: "linear-gradient(90deg, #6366f1, #818cf8)",
          width: `${progress}%`,
          transition: "width 0.1s linear",
        }} />
      </div>

      <div style={{
        display: "flex", alignItems: "center", gap: 4,
        fontSize: "0.62rem", color: "#6366f1", fontWeight: 600,
      }}>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
        </svg>
        Voice Recording
      </div>

      <style>{`@keyframes cp-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

/* ══════════════════════════════════════════════
   FILE PREVIEW GRID
══════════════════════════════════════════════ */
function FilePreviewGrid({ urls = [], label, onZoom }) {
  const imageUrls = urls.filter(u => !isAudioUrl(u));
  const audioUrls = urls.filter(u => isAudioUrl(u));

  if (urls.length === 0) {
    return (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
        minWidth: 70,
      }}>
        <span style={{
          fontSize: "0.62rem", color: "#94a3b8", fontWeight: 700,
          textTransform: "uppercase", letterSpacing: "0.06em",
        }}>
          {label}
        </span>
        <span style={{ color: "#cbd5e1", fontSize: "1rem" }}>—</span>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-start", minWidth: 80 }}>
      {label && (
        <span style={{
          fontSize: "0.62rem", color: "#94a3b8", fontWeight: 700,
          textTransform: "uppercase", letterSpacing: "0.06em",
        }}>
          {label}
        </span>
      )}
      {imageUrls.length > 0 && (
        <ImageThumbPanel urls={imageUrls} label="" onZoom={onZoom} />
      )}
      {audioUrls.map((url, idx) => (
        <CustomAudioPlayer key={idx} src={url} />
      ))}
    </div>
  );
}

/* ─── Image Thumbnail Panel ─── */
function ImageThumbPanel({ urls = [], label, onZoom }) {
  const [active, setActive] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [error,  setError]  = useState(false);

  const urlKey = urls.join("|");

  useEffect(() => {
    setActive(0);
    setLoaded(false);
    setError(false);
  }, [urlKey]);

  useEffect(() => {
    setLoaded(false);
    setError(false);
  }, [active]);

  const url = urls[active] || null;

  const selectThumb = (idx) => {
    setActive(idx);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, minWidth: 70 }}>
      {label && (
        <span style={{ fontSize: "0.62rem", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {label}
        </span>
      )}

      <div style={{
        width: 64, height: 64, borderRadius: 8,
        border: "1.5px solid #e2e8f0",
        overflow: "hidden", background: "#f8fafc",
        display: "flex", alignItems: "center", justifyContent: "center",
        position: "relative",
      }}>
        {!url && (
          <span style={{ color: "#cbd5e1", fontSize: "1.4rem" }}>🖼</span>
        )}
        {url && error && (
          <span style={{ color: "#fca5a5", fontSize: "0.6rem", textAlign: "center", padding: 2 }}>
            ❌ Error
          </span>
        )}
        {url && !error && (
          <>
            {!loaded && (
              <div style={{
                position: "absolute", inset: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "#f8fafc",
              }}>
                <div style={{
                  width: 18, height: 18, borderRadius: "50%",
                  border: "2px solid #e2e8f0", borderTopColor: "#4f8ef7",
                  animation: "cp-spin 0.8s linear infinite",
                }} />
              </div>
            )}
            <img
              key={url}
              src={url}
              alt={label}
              style={{
                width: "100%", height: "100%", objectFit: "cover",
                display: loaded ? "block" : "none",
                cursor: "zoom-in",
              }}
              onLoad={() => setLoaded(true)}
              onError={() => { setError(true); setLoaded(false); }}
              onClick={() => onZoom && onZoom(url)}
              title="Click to zoom"
            />
          </>
        )}
      </div>

      {url && loaded && !error && (
        <span
          style={{ fontSize: "0.6rem", color: "#4f8ef7", cursor: "zoom-in", userSelect: "none" }}
          onClick={() => onZoom && onZoom(url)}
        >
          🔍 zoom
        </span>
      )}

      {urls.length > 1 && (
        <div style={{ display: "flex", gap: 3, flexWrap: "wrap", justifyContent: "center", maxWidth: 80 }}>
          {urls.map((u, idx) => (
            <button
              key={idx}
              onClick={() => selectThumb(idx)}
              style={{
                padding: 0,
                border: `1.5px solid ${idx === active ? "#4f8ef7" : "#e2e8f0"}`,
                borderRadius: 4, overflow: "hidden",
                width: 22, height: 22, cursor: "pointer",
                background: "#f1f5f9", flexShrink: 0,
                opacity: idx === active ? 1 : 0.55,
                transition: "opacity .15s, border-color .15s",
              }}
            >
              <img
                src={u} alt={`img-${idx + 1}`}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                onError={e => { e.target.style.opacity = "0.2"; }}
              />
            </button>
          ))}
        </div>
      )}

      {!url && (
        <span style={{ fontSize: "0.65rem", color: "#cbd5e1" }}>—</span>
      )}

      <style>{`@keyframes cp-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

/* ─── Toast ─── */
function Toast({ toast }) {
  if (!toast) return null;
  const colors = {
    success: { bg: "#dcfce7", color: "#14532d", border: "#86efac" },
    warn:    { bg: "#fef9c3", color: "#92400e", border: "#fbbf24" },
    error:   { bg: "#fee2e2", color: "#991b1b", border: "#fca5a5" },
    info:    { bg: "#dbeafe", color: "#1e3a5f", border: "#93c5fd" },
  };
  const c = colors[toast.type] || colors.success;
  return (
    <div style={{
      position: "fixed", bottom: 28, right: 28, zIndex: 8888,
      background: c.bg, color: c.color,
      border: `1.5px solid ${c.border}`,
      padding: "12px 22px", borderRadius: 12,
      fontWeight: 600, fontSize: "0.88rem",
      boxShadow: "0 4px 24px rgba(0,0,0,0.13)",
      display: "flex", alignItems: "center", gap: 8,
      maxWidth: 420,
    }}>
      {toast.msg}
    </div>
  );
}

/* ─── Promotion Result Banner ─── */
function PromotionBanner({ type, empName, fromLevel, toLevel }) {
  if (type === "promoted") {
    return (
      <div style={{
        background: "linear-gradient(135deg,#dcfce7,#bbf7d0)",
        border: "2px solid #86efac", borderRadius: 14,
        padding: "18px 24px", margin: "0 0 16px",
        display: "flex", alignItems: "center", gap: 16,
      }}>
        <span style={{ fontSize: "2rem" }}>🚀</span>
        <div>
          <div style={{ fontWeight: 800, color: "#166534", fontSize: "1rem" }}>
            Promoted to Next Level!
          </div>
          <div style={{ fontSize: "0.83rem", color: "#15803d", marginTop: 2 }}>
            <b>{empName}</b> has been moved from <b>{fromLevel}</b> → <b>{toLevel}</b>.
            EmployeeMaster.TestStatus set to Approved (1).
          </div>
        </div>
      </div>
    );
  }
  if (type === "reexam") {
    return (
      <div style={{
        background: "linear-gradient(135deg,#fee2e2,#fecaca)",
        border: "2px solid #fca5a5", borderRadius: 14,
        padding: "18px 24px", margin: "0 0 16px",
        display: "flex", alignItems: "center", gap: 16,
      }}>
        <span style={{ fontSize: "2rem" }}>🔁</span>
        <div>
          <div style={{ fontWeight: 800, color: "#991b1b", fontSize: "1rem" }}>
            Re-Exam Required
          </div>
          <div style={{ fontSize: "0.83rem", color: "#b91c1c", marginTop: 2 }}>
            <b>{empName}</b> has one or more rejected answers.
            They will see only the rejected questions on next login.
          </div>
        </div>
      </div>
    );
  }
  if (type === "eligible") {
    return (
      <div style={{
        background: "linear-gradient(135deg,#f0fdf4,#dcfce7)",
        border: "2px dashed #86efac", borderRadius: 14,
        padding: "14px 22px", margin: "0 0 16px",
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <span style={{ fontSize: "1.6rem" }}>🌟</span>
        <div style={{ fontWeight: 700, color: "#166534", fontSize: "0.92rem" }}>
          All answers approved! Click <b>"Finalize &amp; Promote"</b> to move this employee to the next level.
        </div>
      </div>
    );
  }
  return null;
}

/* ══════════════════════════════════════════════
   REVIEW TABLE ROWS (shared between current + history)
══════════════════════════════════════════════ */
function ReviewTableRows({ rows, onZoom, reviewPerson, saving, showToast, onApproveClick, onRejectRow, onUndoRow, isHistory = false }) {
  return rows.map((row, i) => {
    const exampleUrls = (row.exampleImg || "")
      .split(",")
      .map(p => p.trim().split("/").pop().split("\\").pop())
      .filter(Boolean)
      .map(name => `${BASE_URL}/Upload/Questions/${row.questionMasterRefid}/${name}`);

    const answerUrls = (row.imgUrl || "")
      .split(",")
      .map(p => p.trim())
      .filter(Boolean)
      .map(p => {
        if (p.startsWith("/Upload") || p.startsWith("/upload")) return `${BASE_URL}${p}`;
        const filename = p.split("/").pop().split("\\").pop();
        return `${BASE_URL}/Upload/User/${row.employeeMasterRefid}/${row.questionMasterRefid}/${filename}`;
      });

    const rowBg =
      row.testStatus === "Approved" ? "rgba(220,252,231,0.35)" :
      row.testStatus === "ReExam"   ? "rgba(254,226,226,0.35)" :
      i % 2 === 0 ? "" : "rgba(248,250,252,0.6)";

    return (
      <tr key={row.id} style={{ background: rowBg }}
        className={`cp-tr ${i % 2 === 0 ? "cp-tr--even" : "cp-tr--odd"}`}>

        {/* S.No */}
        <td className="cp-td cp-td--center">
          <span style={{ fontWeight: 700, color: "#94a3b8", fontSize: "0.8rem" }}>
            {i + 1}
          </span>
        </td>

        {/* Question */}
        <td className="cp-td" style={{ maxWidth: 260 }}>
          <div style={{ fontWeight: 600, fontSize: "0.85rem", color: "#0f172a", marginBottom: 2 }}>
            {row.question}
          </div>
          {row.questionRemarks && (
            <div style={{ fontSize: "0.72rem", color: "#64748b" }}>
              {row.questionRemarks}
            </div>
          )}
          <div style={{ fontSize: "0.7rem", color: "#94a3b8", marginTop: 2 }}>
            Level: {row.levelName || "—"}
          </div>
          {row.testStatus === "ReExam" && (
            <span style={{
              display: "inline-block", marginTop: 4,
              background: "#fee2e2", color: "#b91c1c",
              fontSize: "0.65rem", fontWeight: 700,
              padding: "1px 7px", borderRadius: 8,
            }}>
              🔁 Queued for Re-Exam
            </span>
          )}
        </td>

        {/* Correct Answer */}
        <td className="cp-td cp-td--center">
          <span style={{
            background: "#dcfce7", color: "#15803d",
            fontWeight: 800, padding: "3px 12px",
            borderRadius: 20, fontSize: "0.82rem",
          }}>
            {row.correctAnswer || "—"}
          </span>
        </td>

        {/* Employee Answer */}
        <td className="cp-td cp-td--center">
          <AnswerCell correct={row.correctAnswer} employee={row.employeeAnswer} optionType={row.optionType} />
        </td>

        {/* Example Image */}
        <td className="cp-td cp-td--center">
          <FilePreviewGrid urls={exampleUrls} label="Q Img" onZoom={onZoom} />
        </td>

        {/* Answer Files */}
        <td className="cp-td cp-td--center">
          <FilePreviewGrid urls={answerUrls} label="Ans Files" onZoom={onZoom} />
        </td>

        {/* Time */}
        <td className="cp-td cp-td--center">
          <div style={{ fontSize: "0.78rem", color: "#475569" }}>
            <div>⏱ {fmtTime(row.totalMins)}</div>
            {row.reviewUpdateDate && (
              <div style={{ color: "#94a3b8", fontSize: "0.67rem", marginTop: 2 }}>
                {fmtDate(row.reviewUpdateDate)}
              </div>
            )}
            {row.reviewPersonName && (
              <div style={{ color: "#94a3b8", fontSize: "0.67rem" }}>
                by {row.reviewPersonName}
              </div>
            )}
          </div>
        </td>

        {/* Status */}
        <td className="cp-td cp-td--center">
          <StatusBadge status={row.testStatus} />
        </td>

        {/* Actions */}
        <td className="cp-td cp-td--center">
          {isHistory ? (
            <span style={{ fontSize: "0.72rem", color: "#94a3b8", fontStyle: "italic" }}>Past record</span>
          ) : row.testStatus === "Submitted" ? (
            row.optionType === "Manual" ? (
              /* ── Manual Review Required ── */
              <div style={{ display: "flex", flexDirection: "column", gap: 5, alignItems: "center" }}>
                <span style={{
                  fontSize: "0.68rem", fontWeight: 700, color: "#7c3aed",
                  background: "#ede9fe", padding: "2px 8px", borderRadius: 8,
                  whiteSpace: "nowrap",
                }}>
                  📝 Manual Review Required
                </span>
                <button
                  className="cp-btn cp-btn--reject cp-btn--sm"
                  onClick={() => onRejectRow(row, "ReExam")}
                  disabled={saving}
                >
                  ✗ Mark as Wrong
                </button>
              </div>
            ) : (
              /* ── Normal Approve / Reject ── */
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <button
                  className="cp-btn cp-btn--approve cp-btn--sm"
                  onClick={() => {
                    if (!reviewPerson.trim()) { showToast("⚠️ Enter Reviewer Name first", "warn"); return; }
                    onApproveClick(row);
                  }}
                  disabled={saving}
                >
                  ✅ Approve
                </button>
                <button
                  className="cp-btn cp-btn--reject cp-btn--sm"
                  onClick={() => {
                    if (!reviewPerson.trim()) { showToast("⚠️ Enter Reviewer Name first", "warn"); return; }
                    onRejectRow(row, "ReExam");
                  }}
                  disabled={saving}
                >
                  ❌ Reject
                </button>
              </div>
            )
          ) : (
            <button
              className="cp-btn cp-btn--ghost cp-btn--sm"
              style={{ fontSize: "0.72rem" }}
              onClick={() => onUndoRow(row)}
              disabled={saving}
              title="Undo — set back to Pending"
            >
              ↩ Undo
            </button>
          )}
        </td>
      </tr>
    );
  });
}

/* ══════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════ */
export default function CorrectionsPage() {

  /* ── Search ── */
  const [searchName, setSearchName]       = useState("");
  const [searchRole, setSearchRole]       = useState("");
  const [employees, setEmployees]         = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  /* ── Selected Employee ── */
  const [selectedEmp, setSelectedEmp]     = useState(null);

  /* ── Review Data ── */
  const [reviewRows, setReviewRows]       = useState([]);
  const [reviewLoading, setReviewLoading] = useState(false);

  /* ── Review Modal (per-row approve confirmation) ── */
  const [reviewModal, setReviewModal]     = useState(null);

  /* ── Finalize Modal ── */
  const [finalizeModal, setFinalizeModal] = useState(false);

  /* ── Reviewer name ── */
  const [reviewPerson, setReviewPerson]   = useState("");

  /* ── Action result banner ── */
  const [actionResult, setActionResult]   = useState(null);

  /* ── UI ── */
  const [saving, setSaving]   = useState(false);
  const [toast, setToast]     = useState(null);
  const [zoomImg, setZoomImg] = useState(null);

  /* ── History ── */
  const [historyRows, setHistoryRows]       = useState([]);
  const [showHistory, setShowHistory]       = useState(false);
  const [expandedDates, setExpandedDates]   = useState({});

  /* ── Filter ── */
  const [filterStatus, setFilterStatus]     = useState("All");

  const nameRef = useRef();

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  /* ── Derived Stats (based on full reviewRows for accurate counters) ── */
  const totalQ   = reviewRows.length;
  const approved = reviewRows.filter(r => r.testStatus === "Approved").length;
  const reExam   = reviewRows.filter(r => r.testStatus === "ReExam").length;
  const pending  = reviewRows.filter(r => r.testStatus === "Submitted").length;

  const allActioned = totalQ > 0 && pending === 0;
  const allApproved = totalQ > 0 && approved === totalQ;

  /* ── Filtered rows for table display ── */
  const filteredRows = filterStatus === "All"
    ? reviewRows
    : reviewRows.filter(r => r.testStatus === filterStatus);

  /* ─── SEARCH EMPLOYEES ─── */
  const handleSearch = async () => {
    if (!searchName.trim() && !searchRole.trim()) {
      showToast("⚠️ Please enter Employee Name or Role to search", "warn");
      return;
    }

    setSearchLoading(true);
    setSelectedEmp(null);
    setReviewRows([]);
    setActionResult(null);

    try {
      const res = await api("/SupportApp/SelectEmployeeByName", {
        EmployeeName: searchName.trim(),
      });

      if (res.IsSuccess && Array.isArray(res.Data3)) {
        let list = res.Data3.map(r => ({
          id:               r.Id               ?? r.id,
          employeeName:     r.EmployeeName      ?? r.employeeName,
          roleType:         r.RoleType          ?? r.roleType   ?? r.RoleName ?? r.roleName,
          testLevel:        r.TestLevel         ?? r.testLevel,
          levelMasterRefid: r.LevelMasterRefid  ?? r.levelMasterRefid,
          levelName:        r.LevelName         ?? r.levelName,
        }));

        if (searchRole.trim()) {
          const q = searchRole.trim().toLowerCase();
          list = list.filter(e => (e.roleType || "").toLowerCase().includes(q));
        }

        setEmployees(list);
        if (list.length === 0) showToast("⚠️ No employees found", "warn");
      } else {
        setEmployees([]);
        showToast(`⚠️ ${res.Message || "No employees found"}`, "warn");
      }
    } finally {
      setSearchLoading(false);
    }
  };

  /* ─── SELECT EMPLOYEE → LOAD REVIEW DATA ─── */
  const handleSelectEmployee = async (emp) => {
    setSelectedEmp(emp);
    setReviewRows([]);
    setActionResult(null);
    setReviewLoading(true);
    setShowHistory(false);
    setFilterStatus("All");
    try {
      const res = await api("/SupportApp/SelectTestReview", {
        EmployeeMasterRefid: emp.id,
      });
      if (res.IsSuccess && Array.isArray(res.Data3)) {
        const rows = res.Data3.map(r => ({
          id:                    r.Id,
          refDate:               r.RefDate,
          employeeMasterRefid:   r.EmployeeMasterRefid ?? r.employeeMasterRefid,
          questionMasterRefid:   r.QuestionMasterRefid,
          question:              r.Question,
          questionRemarks:       r.QuestionRemarks,
          exampleImg:            r.ExampleImg,
          correctAnswer:         r.Answer,
          levelName:             r.LevelName,
          employeeAnswer:        r.EmployeeAnswer,
          optionType:            r.OptionType,
          answerRemarks:         r.AnswerRemarks,
          testStatus:            r.RowTestStatus,
          startTime:             r.StartTime,
          endTime:               r.EndTime,
          totalMins:             r.TotalMins,
          reviewPersonName:      r.ReviewPersonName,
          reviewUpdateDate:      r.ReviewUpdateDate,
          imgUrl:                r.ImgUrl,
        }));

        // ── SHOW ONLY LATEST ATTEMPT ──
        // Find the max refDate across all rows
        const latestDate = rows.reduce((max, r) => {
          const d = new Date(r.refDate || 0);
          return d > max ? d : max;
        }, new Date(0));
        const latestDateStr = latestDate.toDateString();
        const latestRows = rows.filter(r =>
          new Date(r.refDate || 0).toDateString() === latestDateStr
        );

        setReviewRows(latestRows);
        setHistoryRows(rows); // cache full history for History panel
      } else {
        showToast(`⚠️ ${res.Message || "No test data found for this employee"}`, "warn");
      }
    } finally {
      setReviewLoading(false);
    }
  };

  /* ─── APPROVE SINGLE ROW ─── */
  const handleApprove = async (row) => {
    if (!reviewPerson.trim()) {
      showToast("⚠️ Enter Reviewer Name first", "warn");
      return;
    }
    setSaving(true);
    try {
      const res = await api("/SupportApp/UpdateTestReview", {
        Id:               row.id,
        RowTestStatus:    "Approved",
        AnswerRemarks:    row.answerRemarks || "",
        ReviewPersonName: reviewPerson.trim(),
      });
      if (res.IsSuccess) {
        showToast("✅ Answer approved");
        setReviewModal(null);
        await handleSelectEmployee(selectedEmp);
      } else {
        showToast(`❌ ${res.Message || "Failed to approve"}`, "error");
      }
    } finally {
      setSaving(false);
    }
  };

  /* ─── REJECT / MARK-AS-WRONG SINGLE ROW ─── */
  const handleReject = async (row, status = "ReExam") => {
    if (!reviewPerson.trim()) {
      showToast("⚠️ Enter Reviewer Name first", "warn");
      return;
    }
    setSaving(true);
    try {
      const res = await api("/SupportApp/UpdateTestReview", {
        Id:               row.id,
        RowTestStatus:    status,
        AnswerRemarks:    row.answerRemarks || "",
        ReviewPersonName: reviewPerson.trim(),
      });
      if (res.IsSuccess) {
        showToast(status === "ReExam" ? "🔁 Marked as Re-Exam Required" : `↩ Set to ${status}`, "warn");
        await handleSelectEmployee(selectedEmp);
      } else {
        showToast(`❌ ${res.Message || "Failed to update"}`, "error");
      }
    } finally {
      setSaving(false);
    }
  };

  /* ─── UNDO ROW ─── */
  const handleUndo = async (row) => {
    if (!reviewPerson.trim()) {
      showToast("⚠️ Enter Reviewer Name first", "warn");
      return;
    }
    const res = await api("/SupportApp/UpdateTestReview", {
      Id:               row.id,
      RowTestStatus:    "Submitted",
      AnswerRemarks:    row.answerRemarks || "",
      ReviewPersonName: reviewPerson.trim(),
    });
    if (res.IsSuccess) {
      showToast("↩️ Row reset to Pending", "info");
      handleSelectEmployee(selectedEmp);
    }
  };

  /* ─── APPROVE ALL (bulk) ─── */
  const handleApproveAll = async () => {
    if (!reviewPerson.trim()) {
      showToast("⚠️ Enter Reviewer Name first", "warn");
      return;
    }
    const pendingRows = reviewRows.filter(r => r.testStatus === "Submitted");
    if (pendingRows.length === 0) {
      showToast("ℹ️ No pending submissions to approve", "info");
      return;
    }
    if (!window.confirm(`Approve all ${pendingRows.length} pending answer(s) for ${selectedEmp?.employeeName}?`)) return;
    setSaving(true);
    try {
      for (const row of pendingRows) {
        await api("/SupportApp/UpdateTestReview", {
          Id:               row.id,
          RowTestStatus:    "Approved",
          AnswerRemarks:    row.answerRemarks || "",
          ReviewPersonName: reviewPerson.trim(),
        });
      }
      showToast("✅ All pending answers approved");
      await handleSelectEmployee(selectedEmp);
    } finally {
      setSaving(false);
    }
  };

  /* ─── REJECT ALL (bulk) ─── */
  const handleRejectAll = async () => {
    if (!reviewPerson.trim()) {
      showToast("⚠️ Enter Reviewer Name first", "warn");
      return;
    }
    const pendingRows = reviewRows.filter(r => r.testStatus === "Submitted");
    if (pendingRows.length === 0) {
      showToast("ℹ️ No pending submissions to reject", "info");
      return;
    }
    if (!window.confirm(`Mark all ${pendingRows.length} pending answer(s) as Re-Exam for ${selectedEmp?.employeeName}?`)) return;
    setSaving(true);
    try {
      for (const row of pendingRows) {
        await api("/SupportApp/UpdateTestReview", {
          Id:               row.id,
          RowTestStatus:    "ReExam",
          AnswerRemarks:    row.answerRemarks || "",
          ReviewPersonName: reviewPerson.trim(),
        });
      }
      showToast("🔁 All pending answers marked Re-Exam", "warn");
      await handleSelectEmployee(selectedEmp);
    } finally {
      setSaving(false);
    }
  };

  /* ─── FINALIZE ─── */
  const handleFinalize = async () => {
    if (!reviewPerson.trim()) {
      showToast("⚠️ Enter Reviewer Name first", "warn");
      return;
    }
    const stillPending = reviewRows.filter(r => r.testStatus === "Submitted");
    if (stillPending.length > 0) {
      showToast(`⚠️ ${stillPending.length} answer(s) still waiting for review. Action them first.`, "warn");
      return;
    }

    setSaving(true);
    try {
      const allApprovedNow = reviewRows.every(r => r.testStatus === "Approved");

      if (allApprovedNow) {
        const res = await api("/SupportApp/FinalizeTestReview", {
          EmployeeMasterRefid: selectedEmp.id,
          TestStatus:          1,
          ReviewPersonName:    reviewPerson.trim(),
        });
        if (res.IsSuccess) {
          const fromLevel = selectedEmp.testLevel || selectedEmp.levelName || "Current Level";
          const toLevel   = res.NextLevel || "Next Level";
          setActionResult({ type: "promoted", empName: selectedEmp.employeeName, fromLevel, toLevel });
          showToast(`🚀 ${selectedEmp.employeeName} promoted to ${toLevel}!`);
          await handleSelectEmployee({ ...selectedEmp, testLevel: toLevel });
        } else {
          showToast(`❌ ${res.Message || "Finalize failed"}`, "error");
        }
      } else {
        const res = await api("/SupportApp/FinalizeTestReview", {
          EmployeeMasterRefid: selectedEmp.id,
          TestStatus:          0,
          ReviewPersonName:    reviewPerson.trim(),
        });
        if (res.IsSuccess) {
          setActionResult({ type: "reexam", empName: selectedEmp.employeeName });
          showToast(`🔁 ${selectedEmp.employeeName} set to Re-Exam.`, "warn");
          await handleSelectEmployee(selectedEmp);
        } else {
          showToast(`❌ ${res.Message || "Finalize failed"}`, "error");
        }
      }
    } finally {
      setSaving(false);
      setFinalizeModal(false);
    }
  };

  /* ─── TOGGLE HISTORY DATE ACCORDION ─── */
  const toggleHistoryDate = (dateKey) => {
    setExpandedDates(prev => ({ ...prev, [dateKey]: !prev[dateKey] }));
  };

  /* ══════════════════════════════════════════ RENDER ══ */
  return (
    <AdminLayout>
      <div className="cp-root">

        {/* ── PAGE HEADER ── */}
        <div className="cp-page-header">
          <div>
            <h1 className="cp-page-title">📋 Corrections &amp; Review</h1>
            <p className="cp-page-sub">
              Search employee → review answers → approve / reject → finalize (promote or re-exam)
            </p>
          </div>
        </div>

        {/* ══ STEP 1: SEARCH ══ */}
        <div className="cp-card">
          <div className="cp-card-title">
            <span className="cp-step-badge">1</span>
            Search Employee
          </div>

          <div className="cp-search-row">
            <div className="cp-field">
              <label className="cp-label">Employee Name</label>
              <input
                ref={nameRef}
                className="cp-input"
                placeholder="Type name to search… (leave blank to search by role)"
                value={searchName}
                onChange={e => setSearchName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSearch()}
              />
            </div>
            <div className="cp-field">
              <label className="cp-label">Role Type</label>
              <input
                className="cp-input"
                placeholder="Support / Sales / Implementation…"
                value={searchRole}
                onChange={e => setSearchRole(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSearch()}
              />
            </div>
            <button
              className="cp-btn cp-btn--primary"
              onClick={handleSearch}
              disabled={searchLoading}
            >
              {searchLoading ? "🔍 Searching…" : "🔍 Search"}
            </button>
            <button
              className="cp-btn cp-btn--ghost"
              onClick={() => {
                setSearchName(""); setSearchRole("");
                setEmployees([]); setSelectedEmp(null);
                setReviewRows([]); setActionResult(null);
                setHistoryRows([]); setShowHistory(false);
                setFilterStatus("All");
              }}
            >
              ✕ Clear
            </button>
          </div>

          {/* Employee Results */}
          {employees.length > 0 && (
            <div className="cp-emp-list">
              {employees.map(emp => (
                <div
                  key={emp.id}
                  className={`cp-emp-card ${selectedEmp?.id === emp.id ? "cp-emp-card--active" : ""}`}
                  onClick={() => handleSelectEmployee(emp)}
                >
                  <div className="cp-emp-avatar">
                    {(emp.employeeName || "?")[0].toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="cp-emp-name">{emp.employeeName}</div>
                    <div className="cp-emp-meta">
                      <RolePill role={emp.roleType} />
                      <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                        Level: <b>{emp.levelName || emp.testLevel || "—"}</b>
                      </span>
                    </div>
                  </div>
                  <div className="cp-emp-id">#{emp.id}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ══ STEP 2: SELECTED EMPLOYEE CARD ══ */}
        {selectedEmp && (
          <div className="cp-card cp-selected-emp">
            <div className="cp-card-title">
              <span className="cp-step-badge">2</span>
              Selected Employee
            </div>

            <div className="cp-selected-info">
              <div className="cp-emp-avatar cp-emp-avatar--lg">
                {(selectedEmp.employeeName || "?")[0].toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: "1.1rem", color: "#0f172a" }}>
                  {selectedEmp.employeeName}
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 4 }}>
                  <RolePill role={selectedEmp.roleType} />
                  <span style={{ fontSize: "0.78rem", color: "#64748b" }}>
                    Level: <b>{selectedEmp.levelName || selectedEmp.testLevel || "—"}</b>
                  </span>
                  <span style={{ fontSize: "0.78rem", color: "#64748b" }}>
                    ID: #{selectedEmp.id}
                  </span>
                </div>
              </div>

              {/* Stats */}
              {totalQ > 0 && (
                <div className="cp-stats-row">
                  <div className="cp-stat cp-stat--blue">
                    <div className="cp-stat-num">{totalQ}</div>
                    <div className="cp-stat-label">Total</div>
                  </div>
                  <div className="cp-stat cp-stat--green">
                    <div className="cp-stat-num">{approved}</div>
                    <div className="cp-stat-label">Approved</div>
                  </div>
                  <div className="cp-stat cp-stat--red">
                    <div className="cp-stat-num">{reExam}</div>
                    <div className="cp-stat-label">Re-Exam</div>
                  </div>
                  <div className="cp-stat cp-stat--yellow">
                    <div className="cp-stat-num">{pending}</div>
                    <div className="cp-stat-label">Pending</div>
                  </div>
                </div>
              )}
            </div>

            {/* Action Result Banner */}
            {actionResult && (
              <div style={{ marginTop: 14 }}>
                <PromotionBanner {...actionResult} />
              </div>
            )}

            {/* Eligible banner — all approved, not yet finalized */}
            {!actionResult && allApproved && totalQ > 0 && (
              <div style={{ marginTop: 14 }}>
                <PromotionBanner type="eligible" />
              </div>
            )}

            {/* Finalize Button */}
            {allActioned && !actionResult && totalQ > 0 && (
              <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button
                  className="cp-btn"
                  style={{
                    background: allApproved
                      ? "linear-gradient(135deg,#16a34a,#15803d)"
                      : "linear-gradient(135deg,#dc2626,#b91c1c)",
                    color: "#fff", fontWeight: 800,
                    fontSize: "0.93rem", padding: "10px 28px",
                    borderRadius: 10, border: "none",
                    cursor: "pointer",
                    boxShadow: "0 3px 12px rgba(0,0,0,0.15)",
                  }}
                  onClick={() => {
                    if (!reviewPerson.trim()) {
                      showToast("⚠️ Enter Reviewer Name first", "warn");
                      return;
                    }
                    setFinalizeModal(true);
                  }}
                  disabled={saving}
                >
                  {allApproved ? "🚀 Finalize & Promote to Next Level" : "🔁 Finalize & Set Re-Exam"}
                </button>
              </div>
            )}

            {/* ── History Button ── */}
            {historyRows.length > reviewRows.length && (
              <div style={{ marginTop: 12 }}>
                <button
                  className="cp-btn cp-btn--ghost"
                  onClick={() => setShowHistory(h => !h)}
                  style={{ fontSize: "0.82rem" }}
                >
                  {showHistory ? "▲ Hide Past Attempts" : "🕓 View Past Attempts"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ══ STEP 3: REVIEW TABLE ══ */}
        {selectedEmp && (
          <div className="cp-card">
            <div className="cp-card-header-row">
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <div className="cp-card-title" style={{ marginBottom: 0 }}>
                  <span className="cp-step-badge">3</span>
                  Review Answers
                  {reviewRows.length > 0 && (
                    <span style={{ marginLeft: 8, fontSize: "0.8rem", fontWeight: 500, color: "#64748b" }}>
                      ({reviewRows.length} questions
                      {reExam > 0 ? ` · ${reExam} Re-Exam` : ""}
                      {pending > 0 ? ` · ${pending} Pending` : ""}
                      )
                    </span>
                  )}
                </div>
                {/* Current Attempt label */}
                <span style={{
                  fontSize: "0.68rem", fontWeight: 700, color: "#6366f1",
                  background: "#eef2ff", padding: "3px 10px", borderRadius: 8,
                  letterSpacing: "0.04em",
                }}>
                  📌 Current Attempt
                </span>
              </div>

              {reviewRows.length > 0 && (
                <div className="cp-reviewer-row">
                  {/* Filter Dropdown */}
                  <select
                    className="cp-input cp-input--sm"
                    value={filterStatus}
                    onChange={e => setFilterStatus(e.target.value)}
                    style={{ minWidth: 130 }}
                  >
                    {["All", "Approved", "ReExam", "Submitted"].map(s => (
                      <option key={s} value={s}>{s === "All" ? "All Statuses" : s}</option>
                    ))}
                  </select>
                  <input
                    className="cp-input cp-input--sm"
                    placeholder="Reviewer Name (required)"
                    value={reviewPerson}
                    onChange={e => setReviewPerson(e.target.value)}
                    style={{ minWidth: 210 }}
                  />
                  <button
                    className="cp-btn cp-btn--approve"
                    onClick={handleApproveAll}
                    disabled={saving || pending === 0}
                    title={pending === 0 ? "No pending answers" : "Approve all pending"}
                  >
                    ✅ Approve Pending
                  </button>
                  <button
                    className="cp-btn cp-btn--reject"
                    onClick={handleRejectAll}
                    disabled={saving || pending === 0}
                    title={pending === 0 ? "No pending answers" : "Reject all pending"}
                  >
                    ❌ Reject Pending
                  </button>
                </div>
              )}
            </div>

            {reviewLoading && (
              <div className="cp-loading">
                <div className="cp-spinner" />
                Loading test data…
              </div>
            )}

            {!reviewLoading && reviewRows.length === 0 && (
              <div className="cp-empty">
                📭 No test submissions found for this employee yet.
              </div>
            )}

            {!reviewLoading && reviewRows.length > 0 && (
              <div className="cp-table-wrap">
                <table className="cp-table">
                  <thead>
                    <tr>
                      {[
                        "S.No", "Question", "Correct Ans", "Employee Ans",
                        "Example Img", "Answer Files", "Time", "Status", "Actions",
                      ].map(h => (
                        <th key={h} className="cp-th">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <ReviewTableRows
                      rows={filteredRows}
                      onZoom={setZoomImg}
                      reviewPerson={reviewPerson}
                      saving={saving}
                      showToast={showToast}
                      onApproveClick={(row) => setReviewModal(row)}
                      onRejectRow={(row, status) => handleReject(row, status)}
                      onUndoRow={(row) => handleUndo(row)}
                      isHistory={false}
                    />
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ══ HISTORY SECTION ══ */}
        {selectedEmp && showHistory && (() => {
          const latestDateStr = reviewRows[0]?.refDate
            ? new Date(reviewRows[0].refDate).toDateString()
            : null;

          const pastRows = historyRows.filter(r =>
            new Date(r.refDate || 0).toDateString() !== latestDateStr
          );

          const grouped = pastRows.reduce((acc, r) => {
            const key = new Date(r.refDate || 0).toDateString();
            if (!acc[key]) acc[key] = [];
            acc[key].push(r);
            return acc;
          }, {});

          const dateKeys = Object.keys(grouped).sort((a, b) => new Date(b) - new Date(a));

          if (dateKeys.length === 0) {
            return (
              <div className="cp-card">
                <div className="cp-empty">📂 No past attempts found.</div>
              </div>
            );
          }

          return dateKeys.map(dateKey => (
            <div className="cp-card" key={dateKey} style={{ padding: "16px 20px" }}>
              {/* Accordion Header */}
              <div
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  cursor: "pointer", userSelect: "none",
                }}
                onClick={() => toggleHistoryDate(dateKey)}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{
                    fontSize: "0.68rem", fontWeight: 700, color: "#94a3b8",
                    background: "#f1f5f9", padding: "2px 9px", borderRadius: 8,
                    letterSpacing: "0.04em",
                  }}>
                    🕓 Past Attempt
                  </span>
                  <span style={{ fontWeight: 700, fontSize: "0.88rem", color: "#1e293b" }}>
                    {dateKey}
                  </span>
                  <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                    ({grouped[dateKey].length} questions)
                  </span>
                </div>
                <span style={{ color: "#94a3b8", fontWeight: 700, fontSize: "0.9rem" }}>
                  {expandedDates[dateKey] ? "▲" : "▼"}
                </span>
              </div>

              {/* Accordion Body */}
              {expandedDates[dateKey] && (
                <div className="cp-table-wrap" style={{ marginTop: 14 }}>
                  <table className="cp-table">
                    <thead>
                      <tr>
                        {[
                          "S.No", "Question", "Correct Ans", "Employee Ans",
                          "Example Img", "Answer Files", "Time", "Status", "Actions",
                        ].map(h => (
                          <th key={h} className="cp-th">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <ReviewTableRows
                        rows={grouped[dateKey]}
                        onZoom={setZoomImg}
                        reviewPerson={reviewPerson}
                        saving={saving}
                        showToast={showToast}
                        onApproveClick={() => {}}
                        onRejectRow={() => {}}
                        onUndoRow={() => {}}
                        isHistory={true}
                      />
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ));
        })()}

      </div>

      {/* ══ Per-Row Approve Confirmation Modal ══ */}
      {reviewModal && (
        <div
          onClick={() => setReviewModal(null)}
          style={{
            position: "fixed", inset: 0, zIndex: 9000,
            background: "rgba(0,0,0,0.45)",
            display: "flex", alignItems: "center", justifyContent: "center",
            backdropFilter: "blur(4px)",
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: "#fff", borderRadius: 18,
              padding: "28px 32px", maxWidth: 440, width: "90%",
              boxShadow: "0 12px 60px rgba(0,0,0,0.2)",
            }}
          >
            <h3 style={{ margin: "0 0 6px", fontSize: "1.05rem", color: "#0f172a" }}>
              ✅ Approve this Answer?
            </h3>
            <p style={{ margin: "0 0 18px", fontSize: "0.85rem", color: "#64748b" }}>
              <b>Q:</b> {reviewModal.question}
            </p>
            <div style={{ display: "flex", gap: 12, marginBottom: 8 }}>
              <div style={{ flex: 1, background: "#f0fdf4", borderRadius: 10, padding: "10px 14px" }}>
                <div style={{ fontSize: "0.7rem", color: "#15803d", fontWeight: 700 }}>CORRECT ANSWER</div>
                <div style={{ fontWeight: 800, fontSize: "1rem" }}>{reviewModal.correctAnswer}</div>
              </div>
              <div style={{ flex: 1, background: "#f8fafc", borderRadius: 10, padding: "10px 14px" }}>
                <div style={{ fontSize: "0.7rem", color: "#64748b", fontWeight: 700 }}>EMPLOYEE ANSWER</div>
                <div style={{ fontWeight: 800, fontSize: "1rem" }}>{reviewModal.employeeAnswer || "—"}</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button
                className="cp-btn cp-btn--approve"
                style={{ flex: 1 }}
                onClick={() => handleApprove(reviewModal)}
                disabled={saving}
              >
                {saving ? "Saving…" : "✅ Confirm Approve"}
              </button>
              <button
                className="cp-btn cp-btn--ghost"
                style={{ flex: 1 }}
                onClick={() => setReviewModal(null)}
                disabled={saving}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ Finalize Confirmation Modal ══ */}
      {finalizeModal && (
        <div
          onClick={() => !saving && setFinalizeModal(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 9100,
            background: "rgba(0,0,0,0.5)",
            display: "flex", alignItems: "center", justifyContent: "center",
            backdropFilter: "blur(6px)",
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: "#fff", borderRadius: 18,
              padding: "32px 36px", maxWidth: 480, width: "92%",
              boxShadow: "0 16px 70px rgba(0,0,0,0.25)",
            }}
          >
            {allApproved ? (
              <>
                <div style={{ fontSize: "2.5rem", textAlign: "center", marginBottom: 10 }}>🚀</div>
                <h3 style={{ margin: "0 0 8px", textAlign: "center", color: "#166534" }}>
                  Promote to Next Level?
                </h3>
                <p style={{ textAlign: "center", color: "#64748b", fontSize: "0.88rem", margin: "0 0 20px" }}>
                  All {totalQ} answers for <b>{selectedEmp?.employeeName}</b> are approved.
                  This will update <code>EmployeeMaster.TestStatus = 1</code> and advance their level.
                </p>
              </>
            ) : (
              <>
                <div style={{ fontSize: "2.5rem", textAlign: "center", marginBottom: 10 }}>🔁</div>
                <h3 style={{ margin: "0 0 8px", textAlign: "center", color: "#991b1b" }}>
                  Set Re-Exam?
                </h3>
                <p style={{ textAlign: "center", color: "#64748b", fontSize: "0.88rem", margin: "0 0 20px" }}>
                  <b>{reExam}</b> answer(s) were rejected for <b>{selectedEmp?.employeeName}</b>.
                  This will update <code>EmployeeMaster.TestStatus = 0</code>.
                  They will see only the rejected questions on next login.
                </p>
              </>
            )}

            <div style={{
              background: "#f8fafc", borderRadius: 10,
              padding: "10px 14px", marginBottom: 20,
              fontSize: "0.82rem", color: "#475569",
            }}>
              <b>Summary:</b> {approved} Approved · {reExam} Re-Exam · {pending} Pending<br />
              <b>Reviewer:</b> {reviewPerson}
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <button
                className="cp-btn"
                style={{
                  flex: 1,
                  background: allApproved ? "#16a34a" : "#dc2626",
                  color: "#fff", fontWeight: 800,
                  border: "none", borderRadius: 10,
                  padding: "11px 0", cursor: "pointer", fontSize: "0.93rem",
                }}
                onClick={handleFinalize}
                disabled={saving}
              >
                {saving ? "Processing…" : allApproved ? "🚀 Confirm Promote" : "🔁 Confirm Re-Exam"}
              </button>
              <button
                className="cp-btn cp-btn--ghost"
                style={{ flex: 1 }}
                onClick={() => setFinalizeModal(false)}
                disabled={saving}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <ZoomModal url={zoomImg} onClose={() => setZoomImg(null)} />
      <Toast toast={toast} />

    </AdminLayout>
  );
}
