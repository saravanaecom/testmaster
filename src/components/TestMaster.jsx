import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import "../TestMaster.css";

// ─────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────
const OPTION_KEYS  = ["A", "B", "C", "D"];
const API_BASE     = "http://localhost:44300/api/SupportApp";
const UPLOAD_BASE  = "http://localhost:44300/api/Commonapp/UploadFile";
const IMG_BASE_URL = "http://localhost:44300";

// ─────────────────────────────────────────
// LIVE DATE HOOK
// ─────────────────────────────────────────
function useLiveDate() {
  const [date, setDate] = useState("");
  useEffect(() => {
    const format = () =>
      new Date().toLocaleString("en-IN", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true,
      });
    setDate(format());
    const t = setInterval(() => setDate(format()), 1000);
    return () => clearInterval(t);
  }, []);
  return date;
}

// ─────────────────────────────────────────
// STABLE BLOB URL HOOK
// ─────────────────────────────────────────
function useObjectUrls(files) {
  const [urls, setUrls] = useState([]);
  useEffect(() => {
    const newUrls = (files || []).map(f => URL.createObjectURL(f));
    setUrls(newUrls);
    return () => newUrls.forEach(u => URL.revokeObjectURL(u));
  }, [files]); // eslint-disable-line react-hooks/exhaustive-deps
  return urls;
}

// ─────────────────────────────────────────
// SVG ICONS
// ─────────────────────────────────────────
function ArrowRight() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M3 8h10M9 4l4 4-4 4" />
    </svg>
  );
}
function Check() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M3 8l4 4 6-7" />
    </svg>
  );
}

// ─────────────────────────────────────────
// MIC RECORDER COMPONENT
// WhatsApp-style round button with pulse animation,
// countdown timer, and audio blob → passed to parent as File
// ─────────────────────────────────────────
function MicRecorder({ onRecordingComplete, disabled }) {
  const [isRecording, setIsRecording]   = useState(false);
  const [seconds,     setSeconds]       = useState(0);
  const [audioBlob,   setAudioBlob]     = useState(null);
  const [audioUrl,    setAudioUrl]      = useState(null);
  const [error,       setError]         = useState(null);

  const mediaRecorderRef = useRef(null);
  const chunksRef        = useRef([]);
  const timerRef         = useRef(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  const startRecording = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/ogg";
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const ext  = mimeType.includes("webm") ? "webm" : "ogg";
        const file = new File([blob], `recording_${Date.now()}.${ext}`, { type: mimeType });
        const url  = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);
        onRecordingComplete(file);
        stream.getTracks().forEach(t => t.stop());
      };

      recorder.start(100);
      setIsRecording(true);
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
    } catch (err) {
      setError("Microphone access denied. Please allow mic permissions.");
    }
  };

  const stopRecording = () => {
    clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const handleClick = () => {
    if (disabled) return;
    if (isRecording) stopRecording();
    else startRecording();
  };

  const discardRecording = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl(null);
    setSeconds(0);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>

        {/* ── Round Mic Button ── */}
        <button
          onClick={handleClick}
          disabled={disabled}
          title={isRecording ? "Stop recording" : "Start voice recording"}
          style={{
            width: 52, height: 52,
            borderRadius: "50%",
            border: "none",
            background: isRecording
              ? "linear-gradient(135deg, #dc2626, #b91c1c)"
              : "linear-gradient(135deg, #6366f1, #4f46e5)",
            color: "#fff",
            cursor: disabled ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: isRecording
              ? "0 0 0 0 rgba(220,38,38,0.4)"
              : "0 4px 14px rgba(99,102,241,0.4)",
            animation: isRecording ? "mic-pulse 1.2s ease-out infinite" : "none",
            transition: "background 0.2s, box-shadow 0.2s",
            flexShrink: 0,
            opacity: disabled ? 0.5 : 1,
          }}
        >
          {isRecording ? (
            /* Stop icon */
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <rect x="5" y="5" width="14" height="14" rx="2"/>
            </svg>
          ) : (
            /* Mic icon */
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
              <line x1="12" y1="19" x2="12" y2="23"/>
              <line x1="8" y1="23" x2="16" y2="23"/>
            </svg>
          )}
        </button>

        {/* ── Status Text ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {isRecording ? (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: "#dc2626",
                  animation: "mic-dot 1s ease-in-out infinite",
                  display: "inline-block", flexShrink: 0,
                }} />
                <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-dim)" }}>
                  Recording…
                </span>
              </div>
              <span style={{
                fontSize: "1.1rem", fontWeight: 800,
                color: "#dc2626", letterSpacing: "0.05em",
                fontVariantNumeric: "tabular-nums",
              }}>
                {formatTime(seconds)}
              </span>
            </>
          ) : audioUrl ? (
            <span style={{ fontSize: "0.82rem", color: "#22c55e", fontWeight: 700 }}>
              ✅ Recording ready ({formatTime(seconds)})
            </span>
          ) : (
            <span style={{ fontSize: "0.82rem", color: "var(--text-dim)", fontWeight: 600 }}>
              🎙 Tap to record a voice answer
            </span>
          )}
        </div>
      </div>

      {/* ── Audio Playback Preview ── */}
      {audioUrl && !isRecording && (
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          background: "rgba(99,102,241,0.08)",
          border: "1.5px solid rgba(99,102,241,0.25)",
          borderRadius: 10, padding: "8px 12px",
        }}>
          <audio src={audioUrl} controls style={{ height: 32, flex: 1, minWidth: 0 }} />
          <button
            onClick={discardRecording}
            title="Remove recording"
            style={{
              width: 26, height: 26, borderRadius: "50%",
              border: "none", background: "#fee2e2", color: "#b91c1c",
              fontSize: "0.7rem", cursor: "pointer", fontWeight: 700,
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}
          >✕</button>
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div style={{ fontSize: "0.78rem", color: "#dc2626", fontWeight: 600 }}>
          ⚠️ {error}
        </div>
      )}

      <style>{`
        @keyframes mic-pulse {
          0%   { box-shadow: 0 0 0 0 rgba(220,38,38,0.5); }
          70%  { box-shadow: 0 0 0 16px rgba(220,38,38,0); }
          100% { box-shadow: 0 0 0 0 rgba(220,38,38,0); }
        }
        @keyframes mic-dot {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.2; }
        }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────
// STATUS POPUP
// ─────────────────────────────────────────
function StatusPopup({ mode, rejectedCount, nextLevel, currentLevel, onProceed, onLogout }) {
  if (!mode || mode === "new") return null;

  const isReExam   = mode === "reexam";
  const isApproved = mode === "approved";

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(13,27,62,0.82)",
      backdropFilter: "blur(10px)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{
        background: "#fff", borderRadius: 20,
        padding: "36px 40px", maxWidth: 460, width: "92%",
        boxShadow: "0 20px 80px rgba(0,0,0,0.35)",
        textAlign: "center",
      }}>
        <div style={{ fontSize: "3rem", marginBottom: 12 }}>
          {isApproved ? "🚀" : "🔁"}
        </div>
        <div style={{
          fontSize: "1.2rem", fontWeight: 800,
          color: isApproved ? "#166534" : "#991b1b",
          marginBottom: 8,
        }}>
          {isApproved ? "Test Approved!" : "Re-Exam Required"}
        </div>
        <div style={{ fontSize: "0.92rem", color: "#475569", marginBottom: 20, lineHeight: 1.6 }}>
          {isApproved ? (
            <>
              Congratulations! All your answers have been approved.
              <br />
              You have been promoted from <strong>{currentLevel}</strong> to{" "}
              <strong style={{ color: "#16a34a" }}>{nextLevel || "the next level"}</strong>.
              <br /><br />
              New questions for <strong>{nextLevel}</strong> are ready for you.
            </>
          ) : (
            <>
              You have{" "}
              <strong style={{ color: "#dc2626", fontSize: "1.1rem" }}>{rejectedCount}</strong>{" "}
              question{rejectedCount !== 1 ? "s" : ""} that need re-examination.
              <br /><br />
              Only your rejected questions will be shown. Please complete your pending test.
            </>
          )}
        </div>
        {isReExam && (
          <div style={{
            background: "#fee2e2", borderRadius: 10,
            padding: "10px 18px", marginBottom: 20,
            fontSize: "0.85rem", color: "#b91c1c", fontWeight: 600,
          }}>
            ⚠️ {rejectedCount} rejected question{rejectedCount !== 1 ? "s" : ""} to retry
          </div>
        )}
        {isApproved && (
          <div style={{
            background: "#dcfce7", borderRadius: 10,
            padding: "10px 18px", marginBottom: 20,
            fontSize: "0.85rem", color: "#15803d", fontWeight: 600,
          }}>
            ✅ Promoted: {currentLevel} → {nextLevel || "Next Level"}
          </div>
        )}
        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={onProceed}
            style={{
              flex: 1, padding: "12px 0", borderRadius: 10, border: "none",
              background: isApproved ? "#16a34a" : "#dc2626",
              color: "#fff", fontWeight: 800, fontSize: "0.95rem", cursor: "pointer",
            }}
          >
            {isApproved ? "🚀 Start Next Level" : "▶ Start Re-Exam"}
          </button>
          <button
            onClick={onLogout}
            style={{
              flex: 1, padding: "12px 0", borderRadius: 10,
              border: "1.5px solid #e2e8f0", background: "#f8fafc",
              color: "#475569", fontWeight: 700, fontSize: "0.9rem", cursor: "pointer",
            }}
          >
            🚪 Logout
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// TOPBAR
// ─────────────────────────────────────────
function Topbar({ date, questionCount, employee, isReExam }) {
  return (
    <header className="tm-topbar">
      <div className="tm-logo">
        Test<span className="tm-logo-accent">Master</span>
        {isReExam && (
          <span style={{
            marginLeft: 10, fontSize: "0.65rem",
            background: "#fee2e2", color: "#b91c1c",
            padding: "2px 10px", borderRadius: 20,
            fontWeight: 700, verticalAlign: "middle",
          }}>
            RE-EXAM
          </span>
        )}
      </div>
      <div className="tm-meta-row">
        <div className="tm-pill"><div className="tm-online" /><strong>{employee?.name || "Employee"}</strong></div>
        {employee?.id        && <div className="tm-pill">ID: <strong>{employee.id}</strong></div>}
        {employee?.roleName  && <div className="tm-pill">Dept: <strong>{employee.roleName}</strong></div>}
        {employee?.levelName && <div className="tm-pill">Level: <strong>{employee.levelName}</strong></div>}
        <div className="tm-pill">Questions: <strong>{questionCount}</strong></div>
      </div>
      <div className="tm-date">{date}</div>
    </header>
  );
}

// ─────────────────────────────────────────
// SIDEBAR
// ─────────────────────────────────────────
const LEGEND = [
  { style: { borderColor: "#1e2330", background: "transparent" }, label: "Not visited" },
  { style: { borderColor: "#22c55e", background: "#22c55e" },     label: "Answered"    },
  { style: { borderColor: "#4f8ef7", background: "#4f8ef7" },     label: "Current"     },
];

function Sidebar({ current, answers, answerTexts, questions, onSubmit }) {
  const answered = questions.reduce((count, _, i) => {
    const hasOption = answers[i] !== null;
    const hasText   = (answerTexts[i] || "").trim() !== "";
    return count + (hasOption || hasText ? 1 : 0);
  }, 0);
  return (
    <aside className="tm-sidebar">
      <div>
        <div className="tm-section-label">Question Map</div>
        <div className="tm-qgrid">
          {questions.map((_, i) => (
            <button
              key={i}
              className={[
                "tm-qbtn",
                i === current ? "current" : "",
                (answers[i] !== null || (answerTexts[i] || "").trim() !== "") ? "answered" : "",
              ].filter(Boolean).join(" ")}
              disabled={true}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>
      <div>
        <div className="tm-section-label">Legend</div>
        <div className="tm-legend">
          {LEGEND.map(({ style, label }) => (
            <div className="tm-legend-item" key={label}>
              <div className="tm-legend-dot" style={style} />{label}
            </div>
          ))}
        </div>
      </div>
      <div>
        <div className="tm-section-label">Progress</div>
        <div className="tm-progress-header">
          <span>Answered</span>
          <span>
            <span className="tm-prog-green">{answered}</span>
            <span className="tm-prog-muted">/{questions.length}</span>
          </span>
        </div>
        <div className="tm-progress-track">
          <div
            className="tm-progress-fill"
            style={{ width: questions.length ? `${(answered / questions.length) * 100}%` : "0%" }}
          />
        </div>
        <button className="tm-submit-btn" onClick={onSubmit}>✓ Submit Test</button>
      </div>
    </aside>
  );
}

// ─────────────────────────────────────────
// IMAGE PREVIEW PANEL
// ─────────────────────────────────────────
function ImagePreviewPanel({ imageUrls = [], questionNumber, onZoom }) {
  const [active, setActive] = useState(0);
  const [error,  setError]  = useState(false);
  const [loaded, setLoaded] = useState(false);

  const urlKey = imageUrls.join("|");

  useEffect(() => {
    setActive(0);
    setError(false);
    setLoaded(false);
  }, [urlKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setError(false);
    setLoaded(false);
  }, [active]);

  const imageUrl = imageUrls[active] || null;

  return (
    <div className="tm-img-panel">
      <div className="tm-img-panel-header">
        <div className="tm-img-panel-title">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="1" y="1" width="14" height="14" rx="2" />
            <circle cx="5.5" cy="5.5" r="1.5" />
            <path d="M1 11l4-4 3 3 2-2 5 5" />
          </svg>
          Reference Image
        </div>
        <span className="tm-img-panel-qnum">Q{questionNumber}</span>
      </div>

      <div className="tm-img-preview-box">
        {!imageUrl && (
          <div className="tm-img-placeholder">
            <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" style={{ opacity: 0.35 }}>
              <rect x="3" y="3" width="18" height="18" rx="3" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
            <div className="tm-img-placeholder-text">No image for this question</div>
            <div className="tm-img-placeholder-sub">Image will appear here if available</div>
          </div>
        )}

        {imageUrl && error && (
          <div className="tm-img-placeholder">
            <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
            <div className="tm-img-placeholder-text" style={{ color: "#dc2626" }}>Image failed to load</div>
          </div>
        )}

        {imageUrl && !error && (
          <>
            {!loaded && (
              <div className="tm-img-loading">
                <div className="tm-spinner" /><span>Loading image…</span>
              </div>
            )}
            <img
              key={imageUrl}
              src={imageUrl}
              alt={`Q${questionNumber} reference`}
              className="tm-img-actual"
              style={{ display: loaded ? "block" : "none" }}
              onLoad={() => setLoaded(true)}
              onError={() => { setError(true); setLoaded(false); }}
            />
          </>
        )}
      </div>

      {imageUrl && loaded && !error && (
        <div
          className="tm-img-hint"
          onClick={() => onZoom(imageUrl)}
          style={{ cursor: "zoom-in" }}
        >
          🔍 Click to zoom
        </div>
      )}

      {imageUrls.length > 1 && (
        <div style={{
          display: "flex", gap: 6, flexWrap: "wrap",
          padding: "8px 10px 6px",
          borderTop: "1px solid rgba(255,255,255,0.07)",
        }}>
          {imageUrls.map((url, idx) => (
            <button
              key={idx}
              onClick={() => setActive(idx)}
              title={`Image ${idx + 1}`}
              style={{
                padding: 0,
                border: `2px solid ${idx === active ? "#4f8ef7" : "rgba(255,255,255,0.18)"}`,
                borderRadius: 6, overflow: "hidden", cursor: "pointer",
                width: 44, height: 44, flexShrink: 0,
                background: "rgba(255,255,255,0.05)",
                opacity: idx === active ? 1 : 0.55,
                transition: "opacity .15s, border-color .15s",
              }}
            >
              <img
                src={url}
                alt={`thumb-${idx + 1}`}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                onError={e => { e.target.style.opacity = "0.25"; }}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────
// IMAGE ZOOM MODAL
// ─────────────────────────────────────────
function ImageZoomModal({ imageUrl, onClose }) {
  if (!imageUrl) return null;
  return (
    <div
      className="tm-modal-overlay"
      onClick={onClose}
      style={{ zIndex: 150, background: "rgba(13,27,62,0.75)", backdropFilter: "blur(10px)" }}
    >
      <div
        style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}
        onClick={e => e.stopPropagation()}
      >
        <img
          src={imageUrl}
          alt="Zoomed"
          style={{
            maxWidth: "88vw", maxHeight: "80vh", borderRadius: 16,
            objectFit: "contain", background: "#fff",
            boxShadow: "0 8px 48px rgba(0,0,0,0.5)",
          }}
        />
        <button
          onClick={onClose}
          style={{
            padding: "9px 32px", borderRadius: 10, border: "none",
            background: "#fff", color: "#0d1b3e",
            fontWeight: 700, fontSize: "0.84rem", cursor: "pointer",
          }}
        >
          ✕ Close
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// QUESTION CARD
// ─────────────────────────────────────────
function QuestionCard({
  current, answers, answerTexts, answerImages,
  questions, cardKey,
  onSelect, onAnswerText, onAnswerImage, onAnswerImageRemove,
  onSaveNext, onOpenSubmit,
}) {
  const [zoomImg, setZoomImg] = useState(null);
  const fileInputRef = useRef(null);

  // ✅ FIX 1: Stable blob URLs — generated once per file list, not on every render.
  const currentFiles   = answerImages[current] || [];
  const answerPreviews = useObjectUrls(currentFiles);

  // ✅ FIX 2: Memoize imageUrls so ImagePreviewPanel doesn't get false resets
  const imageUrls = useMemo(
    () => (questions[current]?.imageNames || []).map(
      name => `${IMG_BASE_URL}/Upload/Questions/${questions[current]?.id}/${name}`
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [questions[current]?.id, questions[current]?.imageNames]
  );

  if (!questions.length) return null;

  const q      = questions[current];
  const isLast = current === questions.length - 1;

  // Detect if any current files are audio
  const hasAudioFiles = currentFiles.some(f =>
    f.type.startsWith("audio/") || /\.(mp3|wav|webm|ogg)$/i.test(f.name)
  );
  const hasImageFiles = currentFiles.some(f => f.type.startsWith("image/"));

  // ── Handle mic recording: add audio File to existing images array ──
  const handleMicRecording = (audioFile) => {
    onAnswerImage([audioFile]);
  };

  return (
    <>
      <div className="tm-question-row" key={cardKey}>
        <div className="tm-card">
          {/* ── Question meta ── */}
          <div className="tm-q-meta">
            <span className="tm-q-num">Question {current + 1} of {questions.length}</span>
            <span className="tm-sep">·</span>
            <span className="tm-badge">MCQ</span>
            <span className="tm-sep">·</span>
            <span className="tm-qid">ID: {q.id}</span>
            {q.levelName && (
              <>
                <span className="tm-sep">·</span>
                <span
                  className="tm-badge"
                  style={{ background: "rgba(124,92,252,.12)", color: "#a78bfa", borderColor: "rgba(124,92,252,.2)" }}
                >
                  {q.levelName}
                </span>
              </>
            )}
            {/* ── Answered status badge ── */}
            {answers[current] !== null || (answerTexts[current] && answerTexts[current].trim()) ? (
              <span className="tm-badge" style={{
                background: "rgba(34,197,94,0.12)", color: "#22c55e", borderColor: "rgba(34,197,94,0.2)",
              }}>
                ✅ Answered
              </span>
            ) : (
              <span className="tm-badge" style={{
                background: "rgba(148,163,184,0.1)", color: "#94a3b8", borderColor: "rgba(148,163,184,0.2)",
              }}>
                ○ Not Answered
              </span>
            )}
          </div>

          {/* ── Question text ── */}
          <div className="tm-q-text">{q.text}</div>

          {/* ── Remarks note ── */}
          {q.questionRemarks && q.questionRemarks.trim() && (
            <div className="tm-q-remarks-note">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}>
                <circle cx="8" cy="8" r="7" />
                <path d="M8 7v4M8 5h.01" />
              </svg>
              <span>{q.questionRemarks}</span>
            </div>
          )}

          {/* ── MCQ Options ── */}
          <div className="tm-options">
            {q.options.map((opt, i) => (
              <button
                key={i}
                className={["tm-option", answers[current] === i ? "selected" : ""].filter(Boolean).join(" ")}
                onClick={() => onSelect(i)}
              >
                <div className="tm-opt-key">{OPTION_KEYS[i]}</div>
                <div className="tm-opt-text">{opt}</div>
              </button>
            ))}
          </div>

          {/* ── Manual text input ── */}
          {q.optionType === "manual" && (
            <div style={{ marginTop: 16 }}>
              <textarea
                className="tm-manual-input"
                placeholder="Type your answer here..."
                value={answerTexts[current] || ""}
                onChange={onAnswerText}
                rows={3}
              />
            </div>
          )}

          {/* ══════════════════════════════════════════════
              ATTACHMENT SECTION — Images + Mic
          ══════════════════════════════════════════════ */}
          <div style={{ marginTop: 20 }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 8, marginBottom: 12,
            }}>
              <span style={{
                fontSize: "0.82rem", color: "var(--text-dim)",
                fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em",
              }}>
                📎 Attachments
              </span>
              <span style={{
                fontSize: "0.75rem", color: "var(--text-dim)", fontWeight: 400,
                textTransform: "none", letterSpacing: 0,
              }}>
                (images or voice recording — optional)
              </span>
            </div>

            {/* ── Attachment area: two columns ── */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr auto",
              gap: 14, alignItems: "start",
            }}>
              {/* Left: image upload area */}
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ display: "none" }}
                  onChange={e => {
                    onAnswerImage(Array.from(e.target.files));
                    e.target.value = "";
                  }}
                />

                {currentFiles.length > 0 ? (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {currentFiles.map((file, idx) => {
                      const isAudio = file.type.startsWith("audio/") || /\.(mp3|wav|webm|ogg)$/i.test(file.name);
                      return (
                        <div key={idx} style={{ position: "relative", display: "inline-block" }}>
                          {isAudio ? (
                            /* Audio file preview chip */
                            <div style={{
                              display: "flex", alignItems: "center", gap: 6,
                              background: "rgba(99,102,241,0.1)",
                              border: "2px solid rgba(99,102,241,0.3)",
                              borderRadius: 8, padding: "6px 10px",
                              maxWidth: 200,
                            }}>
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
                              </svg>
                              <span style={{ fontSize: "0.72rem", color: "#6366f1", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {file.name}
                              </span>
                            </div>
                          ) : (
                            <img
                              src={answerPreviews[idx]}
                              alt={`Answer ${idx + 1}`}
                              style={{ width: 80, height: 80, borderRadius: 8, border: "2px solid #4f8ef7", objectFit: "cover" }}
                            />
                          )}
                          <button
                            onClick={() => onAnswerImageRemove(idx)}
                            style={{
                              position: "absolute", top: -6, right: -6,
                              width: 20, height: 20, borderRadius: "50%",
                              border: "none", background: "#dc2626", color: "#fff",
                              fontSize: "0.65rem", cursor: "pointer", fontWeight: 700,
                              display: "flex", alignItems: "center", justifyContent: "center",
                            }}
                          >✕</button>
                        </div>
                      );
                    })}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        width: 80, height: 80, borderRadius: 8,
                        border: "2px dashed #4f8ef7", background: "rgba(79,142,247,0.06)",
                        color: "#4f8ef7", fontSize: "1.4rem", cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}
                      title="Add more images"
                    >+</button>
                  </div>
                ) : (
                  <button
                    className="tm-attach-btn"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    📷 Choose Images
                  </button>
                )}
              </div>

              {/* Right: mic recorder */}
              <div style={{
                borderLeft: "1.5px solid rgba(255,255,255,0.07)",
                paddingLeft: 14,
              }}>
                <MicRecorder
                  onRecordingComplete={handleMicRecording}
                  disabled={false}
                />
              </div>
            </div>
          </div>

          {/* ── Navigation ── */}
          <div className="tm-nav-row">
            <div />
            {!isLast ? (
              <button className="tm-btn tm-btn--next" onClick={onSaveNext}>
                Save & Next <ArrowRight />
              </button>
            ) : (
              <button className="tm-btn tm-btn--confirm" onClick={onOpenSubmit}>
                <Check /> Submit Test
              </button>
            )}
          </div>
        </div>

        <ImagePreviewPanel
          imageUrls={imageUrls}
          questionNumber={current + 1}
          onZoom={setZoomImg}
        />
      </div>

      <ImageZoomModal imageUrl={zoomImg} onClose={() => setZoomImg(null)} />
    </>
  );
}

// ─────────────────────────────────────────
// SUBMIT MODAL
// ─────────────────────────────────────────
function SubmitModal({ answeredCount, total, onCancel, onConfirm, saving }) {
  const unanswered = total - answeredCount;
  return (
    <div className="tm-modal-overlay" onClick={onCancel}>
      <div className="tm-modal" onClick={e => e.stopPropagation()}>
        <div className="tm-modal-icon">{unanswered > 0 ? "⚠️" : "✅"}</div>
        <div className="tm-modal-title">Submit Test?</div>
        <div className="tm-modal-body">
          You have answered <strong className="tm-prog-green">{answeredCount}</strong> of{" "}
          <strong>{total}</strong> questions.
          {unanswered > 0 && (
            <div className="tm-modal-warn">
              {unanswered} question{unanswered !== 1 ? "s" : ""} unanswered
            </div>
          )}
        </div>
        <div className="tm-modal-actions">
          <button className="tm-btn tm-btn--cancel" onClick={onCancel} disabled={saving}>
            ← Go Back
          </button>
          <button className="tm-btn tm-btn--confirm" onClick={onConfirm} disabled={saving}>
            {saving
              ? <><div className="tm-spinner tm-spinner--sm" /> Saving…</>
              : <><Check /> Confirm Submit</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// SUCCESS SCREEN
// ─────────────────────────────────────────
function SuccessScreen({ answeredCount, total, employee, isReExam }) {
  return (
    <div className="tm-success">
      <div className="tm-bg" />
      <div className="tm-success-card">
        <div className="tm-success-icon">{isReExam ? "🔁" : "🎉"}</div>
        <div className="tm-success-title">{isReExam ? "Re-Exam Submitted!" : "Test Submitted!"}</div>
        <div className="tm-success-body">
          You answered <strong>{answeredCount}</strong> of <strong>{total}</strong> questions.
          <br />Your responses have been recorded.
        </div>
        <div className="tm-success-meta">
          <div>Name: <strong>{employee?.name || "—"}</strong></div>
          <div>ID: <strong>{employee?.id || "—"}</strong></div>
        </div>
        <button
          className="tm-btn tm-btn--confirm"
          style={{ marginTop: 20 }}
          onClick={() => { localStorage.removeItem("employee"); window.location.href = "/"; }}
        >
          🚪 Logout
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// LOADING SCREEN
// ─────────────────────────────────────────
function LoadingScreen({ message = "Loading questions..." }) {
  return (
    <div className="tm-success" style={{ background: "#0d1b3e" }}>
      <div className="tm-bg" />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
        <div className="tm-spinner" style={{ width: 48, height: 48, borderWidth: 4 }} />
        <div style={{ color: "#94a3b8", fontSize: "1rem" }}>{message}</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// UPLOAD HELPER
// Uploads ALL files for one question in a SINGLE multipart request.
// Folder: /Upload/User/{empId}/{questionId}/{filename}
// Returns comma-separated relative paths, or "" on fail.
// ─────────────────────────────────────────
async function uploadAnswerImages(files, empId, questionId) {
  if (!files || files.length === 0) return "";
  try {
    const formData = new FormData();
    files.forEach((file, i) => formData.append(`MyImages${i}`, file));

    const res = await fetch(UPLOAD_BASE, {
      method: "POST",
      headers: {
        FolderName:    "User",
        Id:            String(empId),
        SubFolderName: String(questionId),
      },
      body: formData,
    });

    const result = await res.json();

    if (result.ok && Array.isArray(result.data) && result.data.length > 0) {
      return result.data.slice(0, files.length).filter(Boolean).join(",");
    }
    return "";
  } catch {
    return "";
  }
}

// ─────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────
export default function TestMaster() {
  const [questions,    setQuestions]    = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [current,      setCurrent]      = useState(0);
  const [answers,      setAnswers]      = useState([]);
  const [answerTexts,  setAnswerTexts]  = useState([]);
  const [answerImages, setAnswerImages] = useState([]);   // answerImages[i] = File[]
  const [cardKey,      setCardKey]      = useState(0);
  const [showModal,    setShowModal]    = useState(false);
  const [submitted,    setSubmitted]    = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [employee,     setEmployee]     = useState(null);

  const [popupMode,     setPopupMode]     = useState(null);
  const [rejectedCount, setRejectedCount] = useState(0);
  const [isReExamMode,  setIsReExamMode]  = useState(false);
  const [nextLevel,     setNextLevel]     = useState("");
  const [currentLevel,  setCurrentLevel]  = useState("");

  const questionStartTimes = useRef([]);
  const date          = useLiveDate();
  const answeredCount = questions.reduce((count, _, i) => {
    const hasOption = answers[i] !== null;
    const hasText   = (answerTexts[i] || "").trim() !== "";
    return count + (hasOption || hasText ? 1 : 0);
  }, 0);

  // ─────────────────────────────────────────
  // INIT
  // ─────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        setError(null);

        const empRaw = localStorage.getItem("employee");
        if (!empRaw) { window.location.href = "/"; return; }
        const emp = JSON.parse(empRaw);

        const roleMasterRefid = emp.RoleMasterRefid ?? emp.roleMasterRefid;
        if (!roleMasterRefid) {
          throw new Error("Session incomplete. Please login again.");
        }

        setEmployee(emp);
        setCurrentLevel(emp.levelName || "");

        const reviewRes = await fetch(`${API_BASE}/SelectTestReview`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ EmployeeMasterRefid: emp.id }),
        });
        const reviewData = await reviewRes.json();

        const rows = (reviewData.IsSuccess && Array.isArray(reviewData.Data3))
          ? reviewData.Data3 : [];

        const latestStatusByQuestion = new Map();
        for (const r of rows) {
          const qId = String(r.QuestionMasterRefid);
          latestStatusByQuestion.set(qId, r.RowTestStatus ?? r.TestStatus ?? "");
        }

        const pendingReExamIds = new Set();
        for (const [qId, status] of latestStatusByQuestion.entries()) {
          if (status === "ReExam") pendingReExamIds.add(qId);
        }

        const hasSubmittedRows = [...latestStatusByQuestion.values()].some(s => s === "Submitted");
        const allApproved = rows.length > 0 &&
          [...latestStatusByQuestion.values()].every(s => s === "Approved" || s === "Promoted");

        if (pendingReExamIds.size > 0 && !hasSubmittedRows) {
          setRejectedCount(pendingReExamIds.size);
          setPopupMode("reexam");
          await loadReExamQuestions(emp, pendingReExamIds);
        } else if (hasSubmittedRows) {
          setLoading(false);
          setError(
            "Your answers are submitted and waiting for admin review. " +
            "Please check back after your answers have been reviewed."
          );
        } else if (allApproved) {
          const promotedToLevel = emp.levelName || "Next Level";
          setNextLevel(promotedToLevel);
          setPopupMode("approved");
          await loadFreshQuestions(emp);
        } else if (rows.length === 0) {
          setPopupMode(null);
          await loadFreshQuestions(emp);
        } else {
          setPopupMode(null);
          await loadFreshQuestions(emp);
        }

      } catch (err) {
        console.error("TestMaster init error:", err);
        setError(err.message);
        setLoading(false);
      }
    };

    init();
  }, []);

  // ─────────────────────────────────────────
  // LOAD FRESH QUESTIONS
  // ─────────────────────────────────────────
  const loadFreshQuestions = async (emp) => {
    try {
      const roleMasterRefid  = emp.RoleMasterRefid  ?? emp.roleMasterRefid;
      const levelMasterRefid = emp.LevelMasterRefid ?? emp.levelMasterRefid;

      const body = { RoleMasterRefid: roleMasterRefid };
      if (levelMasterRefid) body.LevelMasterRefid = levelMasterRefid;

      const res  = await fetch(`${API_BASE}/SelectQuestionMaster`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.IsSuccess) throw new Error(data.Message || "Failed to load questions");

      const list = data.Data3 || [];
      if (!list.length) throw new Error("No questions found for your level. Please contact your admin.");

      mountQuestions(list);
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────
  // LOAD RE-EXAM QUESTIONS
  // ─────────────────────────────────────────
  const loadReExamQuestions = async (emp, pendingReExamIds) => {
    try {
      setIsReExamMode(true);
      const roleMasterRefid = emp.RoleMasterRefid ?? emp.roleMasterRefid;

      const res  = await fetch(`${API_BASE}/SelectQuestionMaster`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ RoleMasterRefid: roleMasterRefid }),
      });
      const data = await res.json();
      if (!data.IsSuccess) throw new Error(data.Message || "Failed to load questions");

      const list = (data.Data3 || []).filter(q => pendingReExamIds.has(String(q.Id)));
      if (!list.length) {
        throw new Error(
          "Could not find your re-exam questions. This may happen if the questions were deleted. " +
          "Please contact your admin."
        );
      }

      mountQuestions(list);
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────
  // MOUNT QUESTIONS
  // ─────────────────────────────────────────
  const mountQuestions = (rawList) => {
    const formatted = rawList.map(q => ({
      id:              q.Id,
      text:            q.Question,
      questionRemarks: q.QuestionRemarks || "",
      levelName:       q.LevelName,
      roleName:        q.RoleName,
      imageNames: (q.ExampleImg || "")
        .split(",")
        .map(p => p.trim().split("/").pop().split("\\").pop())
        .filter(Boolean),
      optionType: q.OptionType || "option",
      options:    [q.OptionA, q.OptionB, q.OptionC, q.OptionD].filter(Boolean),
    }));

    setQuestions(formatted);
    setAnswers(Array(formatted.length).fill(null));
    setAnswerTexts(Array(formatted.length).fill(""));
    setAnswerImages(Array(formatted.length).fill(null).map(() => []));

    const starts = Array(formatted.length).fill(null);
    starts[0] = new Date().toISOString();
    questionStartTimes.current = starts;
  };

  // ─────────────────────────────────────────
  // NAVIGATION
  // ─────────────────────────────────────────
  const goTo = useCallback((idx) => {
    if (!questionStartTimes.current[idx]) {
      questionStartTimes.current[idx] = new Date().toISOString();
    }
    setCurrent(idx);
    setCardKey(k => k + 1);
  }, []);

  const handleSelect            = (i)     => setAnswers(prev    => { const n = [...prev]; n[current] = i;              return n; });
  const handleAnswerText        = (e)     => setAnswerTexts(prev => { const n = [...prev]; n[current] = e.target.value; return n; });
  const handleAnswerImage       = (files) => setAnswerImages(prev => { const n = [...prev]; n[current] = [...(n[current] || []), ...files]; return n; });
  const handleAnswerImageRemove = (imgIdx) => setAnswerImages(prev => { const n = [...prev]; n[current] = (n[current] || []).filter((_, i) => i !== imgIdx); return n; });
  const handleSaveNext          = ()      => { if (current < questions.length - 1) goTo(current + 1); };
  const handleLogout            = ()      => { localStorage.removeItem("employee"); window.location.href = "/"; };
  const handlePopupProceed      = ()      => setPopupMode(null);

  // ─────────────────────────────────────────
  // SUBMIT
  // ─────────────────────────────────────────
  const handleSubmit = async () => {
    setSaving(true);
    try {
      const emp   = JSON.parse(localStorage.getItem("employee"));
      const empId = emp?.id || 0;
      const now   = new Date().toISOString();

      // ── Step 1: Upload images/audio — ONE batch call per question ──
      const uploadedImgPaths = await Promise.all(
        questions.map(async (q, i) => {
          const files = answerImages[i] || [];
          if (files.length === 0) return "";
          return await uploadAnswerImages(files, empId, q.id);
        })
      );

      // ── Step 2: Build answer list with ImgUrl populated ──
      const answerList = questions.map((q, i) => {
        const startTime = questionStartTimes.current[i] || now;
        const endTime   = now;
        const totalSec  = Math.round((new Date(endTime) - new Date(startTime)) / 1000);

        let finalAnswer = "";
        if (answerTexts[i] && answerTexts[i].trim() !== "") {
          finalAnswer = answerTexts[i];
        } else if (answers[i] !== null) {
          finalAnswer = OPTION_KEYS[answers[i]] || "";
        }

        return {
          EmployeeMasterRefid: empId,
          QuestionMasterRefid: q.id,
          AnswerRemarks:       "",
          OptionType:          q.optionType || "option",
          Answer:              finalAnswer,
          TestStatus:          "Submitted",
          StartTime:           startTime,
          EndTime:             endTime,
          TotalMins:           totalSec,
          ImgUrl: uploadedImgPaths[i] || "",
        };
      });

      // ── Step 3: Submit answers to TestMaster ──
      const res  = await fetch(`${API_BASE}/TestMaster`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ AnswerList: answerList }),
      });
      const data = await res.json();
      if (!data.IsSuccess) {
        alert("Failed to save answers: " + (data.Message || "Unknown error"));
        return;
      }

      setShowModal(false);
      setSubmitted(true);

    } catch (err) {
      console.error("Submit error:", err);
      alert("Network error while saving answers.");
    } finally {
      setSaving(false);
    }
  };

  // ─────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────
  if (loading) {
    return <LoadingScreen message={isReExamMode ? "Loading your re-exam questions..." : "Loading questions..."} />;
  }

  if (error) {
    const isWaiting = error.includes("waiting for admin review");
    return (
      <div className="tm-success" style={{ background: "#0d1b3e" }}>
        <div className="tm-bg" />
        <div className="tm-success-card" style={{ borderTop: `4px solid ${isWaiting ? "#f59e0b" : "#dc2626"}` }}>
          <div className="tm-success-icon">{isWaiting ? "⏳" : "⚠️"}</div>
          <div className="tm-success-title" style={{ color: isWaiting ? "#92400e" : "#dc2626" }}>
            {isWaiting ? "Awaiting Review" : "Error"}
          </div>
          <div className="tm-success-body">{error}</div>
          <button
            onClick={handleLogout}
            style={{
              marginTop: 20, padding: "10px 28px",
              borderRadius: 10, border: "none",
              background: "#0d1b3e", color: "#fff",
              fontWeight: 700, cursor: "pointer",
            }}
          >
            🚪 Logout
          </button>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <SuccessScreen
        answeredCount={answeredCount}
        total={questions.length}
        employee={employee}
        isReExam={isReExamMode}
      />
    );
  }

  return (
    <>
      {(popupMode === "reexam" || popupMode === "approved") && (
        <StatusPopup
          mode={popupMode}
          rejectedCount={rejectedCount}
          nextLevel={nextLevel}
          currentLevel={currentLevel}
          onProceed={handlePopupProceed}
          onLogout={handleLogout}
        />
      )}

      <div className="tm-root">
        <div className="tm-bg" />

        <Topbar
          date={date}
          questionCount={questions.length}
          employee={employee}
          isReExam={isReExamMode}
        />

        <div className="tm-body">
          {questions.length > 0 && (
            <Sidebar
              current={current}
              answers={answers}
              answerTexts={answerTexts}
              questions={questions}
              onSubmit={() => setShowModal(true)}
            />
          )}

          <main className="tm-main">
            {questions.length === 0 && (
              <div className="tm-error">⚠️ No questions available. Please contact your admin.</div>
            )}

            {questions.length > 0 && (
              <QuestionCard
                current={current}
                answers={answers}
                answerTexts={answerTexts}
                answerImages={answerImages}
                questions={questions}
                cardKey={cardKey}
                onSelect={handleSelect}
                onAnswerText={handleAnswerText}
                onAnswerImage={handleAnswerImage}
                onAnswerImageRemove={handleAnswerImageRemove}
                onSaveNext={handleSaveNext}
                onOpenSubmit={() => setShowModal(true)}
              />
            )}
          </main>
        </div>

        {showModal && (
          <SubmitModal
            answeredCount={answeredCount}
            total={questions.length}
            onCancel={() => setShowModal(false)}
            onConfirm={handleSubmit}
            saving={saving}
          />
        )}
      </div>
    </>
  );
}
