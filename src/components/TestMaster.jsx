import { useState, useEffect, useCallback, useRef } from "react";
import "../TestMaster.css";

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

const OPTION_KEYS  = ["A", "B", "C", "D"];
const API_BASE     = "https://testapi.kassapos.co.in/api/SupportApp";
const IMG_BASE_URL = "https://testapi.kassapos.co.in/Upload/Admin/";

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
// TOPBAR
// ─────────────────────────────────────────
function Topbar({ date, questionCount, employee }) {
  return (
    <header className="tm-topbar">
      <div className="tm-logo">Test<span className="tm-logo-accent">Master</span></div>
      <div className="tm-meta-row">
        <div className="tm-pill"><div className="tm-online" /><strong>{employee?.name || "Employee"}</strong></div>
        {employee?.id   && <div className="tm-pill">ID: <strong>{employee.id}</strong></div>}
        {employee?.dept && <div className="tm-pill">Dept: <strong>{employee.dept}</strong></div>}
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

function Sidebar({ current, answers, questions, onSubmit }) {
  const answered = answers.filter(a => a !== null).length;
  return (
    <aside className="tm-sidebar">
      <div>
        <div className="tm-section-label">Question Map</div>
        <div className="tm-qgrid">
          {questions.map((_, i) => (
            <button
              key={i}
              className={["tm-qbtn", i === current ? "current" : "", answers[i] !== null ? "answered" : ""].filter(Boolean).join(" ")}
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
          <span><span className="tm-prog-green">{answered}</span><span className="tm-prog-muted">/{questions.length}</span></span>
        </div>
        <div className="tm-progress-track">
          <div className="tm-progress-fill" style={{ width: questions.length ? `${(answered / questions.length) * 100}%` : "0%" }} />
        </div>
        <button className="tm-submit-btn" onClick={onSubmit}>✓ Submit Test</button>
      </div>
    </aside>
  );
}

// ─────────────────────────────────────────
// IMAGE PREVIEW PANEL
// ─────────────────────────────────────────
function ImagePreviewPanel({ imageUrl, questionNumber, onZoom }) {
  const [imgError,  setImgError]  = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  useEffect(() => { setImgError(false); setImgLoaded(false); }, [imageUrl]);

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
              <rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" />
            </svg>
            <div className="tm-img-placeholder-text">No image for this question</div>
            <div className="tm-img-placeholder-sub">Image will appear here if available</div>
          </div>
        )}
        {imageUrl && imgError && (
          <div className="tm-img-placeholder">
            <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
            </svg>
            <div className="tm-img-placeholder-text" style={{ color: "#dc2626" }}>Image failed to load</div>
            <div className="tm-img-placeholder-sub" style={{ wordBreak: "break-all", fontSize: "0.6rem" }}>{imageUrl}</div>
          </div>
        )}
        {imageUrl && !imgError && (
          <>
            {!imgLoaded && <div className="tm-img-loading"><div className="tm-spinner" /><span>Loading image…</span></div>}
            <img
              src={imageUrl} alt={`Q${questionNumber} reference`} className="tm-img-actual"
              style={{ display: imgLoaded ? "block" : "none" }}
              onLoad={() => setImgLoaded(true)}
              onError={() => { setImgError(true); setImgLoaded(false); }}
            />
          </>
        )}
      </div>
      {imageUrl && imgLoaded && !imgError && (
        <div className="tm-img-hint" onClick={onZoom} style={{ cursor: "zoom-in" }}>🔍 Click to zoom</div>
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
    <div className="tm-modal-overlay" onClick={onClose}
      style={{ zIndex: 150, background: "rgba(13,27,62,0.75)", backdropFilter: "blur(10px)" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}
        onClick={e => e.stopPropagation()}>
        <img src={imageUrl} alt="Zoomed"
          style={{ maxWidth: "88vw", maxHeight: "80vh", borderRadius: 16, objectFit: "contain", background: "#fff", boxShadow: "0 8px 48px rgba(0,0,0,0.5)" }} />
        <button onClick={onClose}
          style={{ padding: "9px 32px", borderRadius: 10, border: "none", background: "#fff", color: "#0d1b3e", fontWeight: 700, fontSize: "0.84rem", cursor: "pointer" }}>
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
  onSelect, onAnswerText, onAnswerImage,
  onSaveNext, onOpenSubmit
}) {
  const [zoomImg, setZoomImg] = useState(null);
  const fileInputRef = useRef(null);

  if (!questions.length) return null;

  const q      = questions[current];
  const isLast = current === questions.length - 1;

  let imageUrl = null;
  if (q.fileName && q.fileName.trim()) {
    imageUrl = IMG_BASE_URL + q.fileName.trim();
  }

  const answerImgFile    = answerImages[current] || null;
  const answerImgPreview = answerImgFile ? URL.createObjectURL(answerImgFile) : null;

  return (
    <>
      <div className="tm-question-row" key={cardKey}>
        <div className="tm-card">
          <div className="tm-q-meta">
            <span className="tm-q-num">Question {current + 1} of {questions.length}</span>
            <span className="tm-sep">·</span>
            <span className="tm-badge">MCQ</span>
            <span className="tm-sep">·</span>
            <span className="tm-qid">ID: {q.id}</span>
            {q.levelName && (
              <>
                <span className="tm-sep">·</span>
                <span className="tm-badge" style={{ background: "rgba(124,92,252,.12)", color: "#a78bfa", borderColor: "rgba(124,92,252,.2)" }}>
                  {q.levelName}
                </span>
              </>
            )}
          </div>

          <div className="tm-q-text">{q.text}</div>

          {q.questionRemarks && q.questionRemarks.trim() && (
            <div className="tm-q-remarks-note">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}>
                <circle cx="8" cy="8" r="7" /><path d="M8 7v4M8 5h.01" />
              </svg>
              <span>{q.questionRemarks}</span>
            </div>
          )}

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

          <div className="tm-remarks-label" style={{ marginTop: 14 }}>Answer</div>
          <textarea
            className="tm-remarks"
            placeholder="Type your answer here..."
            value={answerTexts[current] || ""}
            onChange={onAnswerText}
          />

          <div style={{ marginTop: 12 }}>
            <input
              ref={fileInputRef} type="file" accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => { const file = e.target.files?.[0] || null; onAnswerImage(file); e.target.value = ""; }}
            />
            <button className="tm-upload-btn" onClick={() => fileInputRef.current?.click()}>
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="1" y="1" width="14" height="14" rx="2" /><circle cx="5.5" cy="5.5" r="1.5" /><path d="M1 11l4-4 3 3 2-2 5 5" />
              </svg>
              {answerImgFile ? "Change Image" : "Upload Answer Image"}
            </button>
            {answerImgPreview && (
              <div className="tm-answer-img-preview">
                <div className="tm-answer-img-preview-header">
                  <span>Selected image</span>
                  <button className="tm-answer-img-remove" onClick={() => onAnswerImage(null)}>✕</button>
                </div>
                <img src={answerImgPreview} alt="Answer preview" className="tm-answer-img-thumb" />
                <div className="tm-answer-img-name">{answerImgFile.name}</div>
              </div>
            )}
          </div>

          <div className="tm-card-footer">
            {isLast ? (
              <button className="tm-save-btn" onClick={onOpenSubmit}>Save &amp; Submit <Check /></button>
            ) : (
              <button className="tm-save-btn" onClick={onSaveNext}>Save &amp; Next <ArrowRight /></button>
            )}
          </div>
        </div>

        <ImagePreviewPanel imageUrl={imageUrl} questionNumber={current + 1} onZoom={() => setZoomImg(imageUrl)} />
      </div>
      {zoomImg && <ImageZoomModal imageUrl={zoomImg} onClose={() => setZoomImg(null)} />}
    </>
  );
}

// ─────────────────────────────────────────
// SUBMIT MODAL
// ─────────────────────────────────────────
function SubmitModal({ answeredCount, total, onCancel, onConfirm, saving }) {
  return (
    <div className="tm-modal-overlay">
      <div className="tm-modal">
        <div className="tm-modal-icon">📋</div>
        <div className="tm-modal-title">Submit Test?</div>
        <div className="tm-modal-body">
          You're about to submit your test. This action cannot be undone.
          {answeredCount < total && (
            <span style={{ display: "block", marginTop: 8, color: "#fbbf24" }}>
              ⚠️ {total - answeredCount} question{total - answeredCount > 1 ? "s" : ""} unanswered.
            </span>
          )}
        </div>
        <div className="tm-modal-stat">Answered: <span>{answeredCount}</span> / {total}</div>
        <div className="tm-modal-actions">
          <button className="tm-modal-cancel" onClick={onCancel} disabled={saving}>Cancel</button>
          <button className="tm-modal-confirm" onClick={onConfirm} disabled={saving}>
            {saving ? "Saving…" : "Yes, Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// SUCCESS SCREEN
// ─────────────────────────────────────────
function SuccessScreen({ answeredCount, total, employee }) {
  return (
    <div className="tm-success">
      <div className="tm-bg" />
      <div className="tm-success-card">
        <div className="tm-success-icon">🎉</div>
        <div className="tm-success-title">Test Submitted!</div>
        <div className="tm-success-body">
          Thank you, <strong>{employee?.name || "Employee"}</strong>. Your responses have been recorded successfully.
        </div>
        <div className="tm-success-stat">Answered: <span>{answeredCount}</span> / {total}</div>
        <div className="tm-success-id">
          {employee?.id && `ID: ${employee.id}`}
          {employee?.dept && ` · ${employee.dept}`}
        </div>
      </div>
    </div>
  );
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
  const [answerImages, setAnswerImages] = useState([]);
  const [cardKey,      setCardKey]      = useState(0);
  const [showModal,    setShowModal]    = useState(false);
  const [submitted,    setSubmitted]    = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [employee,     setEmployee]     = useState({ id: "", name: "", dept: "" });

  // ── Per-question timing ──
  // questionStartTimes[i] = ISO string when question i was first opened
  const questionStartTimes = useRef([]);

  const date          = useLiveDate();
  const answeredCount = answers.filter(a => a !== null).length;

  useEffect(() => {
    try {
      const emp = JSON.parse(localStorage.getItem("employee"));
      if (emp) setEmployee(emp);
    } catch (_) {}
  }, []);

  useEffect(() => {
    const loadQuestions = async () => {
      try {
        setLoading(true);
        setError(null);

        const empRaw = localStorage.getItem("employee");
        if (!empRaw) { window.location.href = "/login"; return; }

        const emp = JSON.parse(empRaw);
        if (!emp.roleType) throw new Error("Session incomplete. Please login again.");

        const res = await fetch(`${API_BASE}/SelectQuestionMaster`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ RoleType: emp.roleType }),
        });

        const data = await res.json();
        if (!data.IsSuccess) throw new Error(data.Message);

        const list = data.Data3 || [];
        if (!list.length) throw new Error("No questions for this Role");

        console.log("RAW question sample:", list[0]);

        const formatted = list.map(q => ({
          id:              q.Id,
          text:            q.Question,
          questionRemarks: q.QuestionRemarks || "",
          levelName:       q.LevelName,
          roleType:        q.RoleType,
          fileName:        q.ExampleImg || "",
          optionType:      q.OptionType || "option",
          options:         [q.OptionA, q.OptionB, q.OptionC, q.OptionD].filter(Boolean),
        }));

        setQuestions(formatted);
        setAnswers(Array(formatted.length).fill(null));
        setAnswerTexts(Array(formatted.length).fill(""));
        setAnswerImages(Array(formatted.length).fill(null));

        // ── Record start time for question 0 immediately ──
        const starts = Array(formatted.length).fill(null);
        starts[0] = new Date().toISOString();
        questionStartTimes.current = starts;

      } catch (err) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    loadQuestions();
  }, []);

  const goTo = useCallback((idx) => {
    // ── Record start time for the question being navigated TO ──
    if (!questionStartTimes.current[idx]) {
      questionStartTimes.current[idx] = new Date().toISOString();
    }
    setCurrent(idx);
    setCardKey(k => k + 1);
  }, []);

  const handleSelect = (i) =>
    setAnswers(prev => { const n = [...prev]; n[current] = i; return n; });

  const handleAnswerText = (e) =>
    setAnswerTexts(prev => { const n = [...prev]; n[current] = e.target.value; return n; });

  const handleAnswerImage = (file) =>
    setAnswerImages(prev => { const n = [...prev]; n[current] = file; return n; });

  const handleSaveNext = () => {
    if (current < questions.length - 1) goTo(current + 1);
  };

  // ── BUILD ANSWER PAYLOAD & SAVE TO SQL ──
  const handleSubmit = async () => {
    setSaving(true);
    try {
      const emp = JSON.parse(localStorage.getItem("employee"));
      const now = new Date().toISOString();
  
      // ✅ Step 1: Upload all answer images first, get back filenames
      // const uploadedImgUrls = await Promise.all(
      //   answerImages.map(async (file) => {
      //     if (!file) return "";
      //     try {
      //       const formData = new FormData();
      //       formData.append("MyImages0", file);
      //       const res = await fetch("http://localhost:44300/api/Commonapp/UploadFile", {
      //         method: "POST",
      //         body: formData,
      //       });
      //       const result = await res.json();
      //       if (result.ok && result.data.length > 0) {
      //         // ✅ store only filename
      //         return result.data[0].split("/").pop().split("\\").pop();
      //       }
      //       return "";
      //     } catch {
      //       return "";
      //     }
      //   })
      // );
      const uploadedImgUrls = await Promise.all(
        answerImages.map(async (file) => {
          if (!file) return "";
      
          try {
            const formData = new FormData();
            formData.append("MyImages0", file);
      
            const res = await fetch("http://localhost:44300/api/Commonapp/UploadFile", {
              method: "POST",
              headers: {
                "FolderName": "User",
              },
              body: formData,
            });
      
            const result = await res.json();
      
            console.log("Upload FULL response:", result); // 🔥 MUST SEE
      
            // ✅ CASE 1: Your current expected format
            if (result.IsSuccess && result.Data?.length > 0) {
              return result.Data[0].split("/").pop().split("\\").pop();
            }
      
            // ✅ CASE 2: lowercase data
            if (result.data && result.data.length > 0) {
              return result.data[0].split("/").pop().split("\\").pop();
            }
      
            // ✅ CASE 3: single filename
            if (result.FileName) {
              return result.FileName;
            }
      
            // ✅ CASE 4: direct string response
            if (typeof result === "string") {
              return result.split("/").pop().split("\\").pop();
            }
      
            return "";
          } catch (err) {
            console.error("Upload error:", err);
            return "";
          }
        })
      );
      // ✅ Step 2: Build answer list with ImgUrl
      const answerList = questions.map((q, i) => {
        const startTime = questionStartTimes.current[i] || now;
        const endTime   = now;
        const totalSec  = Math.round((new Date(endTime) - new Date(startTime)) / 1000);
  
        let finalAnswer = "";

// முதலில் typed answer check
if (answerTexts[i] && answerTexts[i].trim() !== "") {
  finalAnswer = answerTexts[i];
}
// இல்லனா option
else if (answers[i] !== null) {
  finalAnswer = OPTION_KEYS[answers[i]] || "";
}
  
        return {
          EmployeeMasterRefid: emp?.id        || 0,
          QuestionMasterRefid: q.id,
          AnswerRemarks:        "",
          OptionType:          q.optionType    || "option",
          Answer:              finalAnswer,
          TestStatus:          "Submitted",
          StartTime:           startTime,
          EndTime:             endTime,
          TotalMins:           totalSec,
          ImgUrl:              uploadedImgUrls[i] || "",  // ✅ filename only
        };
      });
  
      console.log("Sending payload:", JSON.stringify({ AnswerList: answerList }, null, 2));
  
      // ✅ Step 3: Save to SQL
      const res = await fetch(`${API_BASE}/TestMaster`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ AnswerList: answerList }),
      });
  
      const data = await res.json();
      if (!data.IsSuccess) {
        console.error("Save failed:", data.Message);
        alert("Failed to save answers: " + data.Message);
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

  if (submitted) {
    return <SuccessScreen answeredCount={answeredCount} total={questions.length} employee={employee} />;
  }

  return (
    <div className="tm-root">
      <div className="tm-bg" />
      <Topbar date={date} questionCount={questions.length} employee={employee} />

      <div className="tm-body">
        {!loading && !error && questions.length > 0 && (
          <Sidebar
            current={current}
            answers={answers}
            questions={questions}
            onGoTo={goTo}
            onSubmit={() => setShowModal(true)}
          />
        )}

        <main className="tm-main">
          {loading && <div className="tm-loading"><div className="tm-spinner" /><span>Loading questions...</span></div>}
          {error && !loading && <div className="tm-error">⚠️ {error}</div>}

          {!loading && !error && questions.length > 0 && (
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
  );
}