import { useState, useEffect, useRef } from "react";
import "../QuestionMaster.css";
import { useNavigate } from "react-router-dom";

const BADGE_COLORS = {
  A: { bg: "#dbeafe", color: "#1d4ed8" },
  B: { bg: "#dcfce7", color: "#15803d" },
  C: { bg: "#fef9c3", color: "#a16207" },
  D: { bg: "#fee2e2", color: "#b91c1c" },
};

const BASE_URL = "https://testapi.kassapos.co.in/";

async function api(endpoint, body = {}) {
  try {
    const url = `${BASE_URL}/api${endpoint}`;
    console.log("Calling:", url);
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      console.error("HTTP Error:", res.status);
      return { IsSuccess: false, Message: "API Error" };
    }
    return await res.json();
  } catch (err) {
    console.error("Fetch Error:", err);
    return { IsSuccess: false, Message: "Network Error" };
  }
}

/* ── Helper Components ── */
function Field({ label, children }) {
  return (
    <div className="qm-field">
      <label className="qm-field-label">{label}</label>
      {children}
    </div>
  );
}

function RolePill({ role }) {
  const map = {
    Support:        ["#dbeafe", "#1d4ed8"],
    Implementation: ["#fef9c3", "#a16207"],
    Sales:          ["#dcfce7", "#15803d"],
  };
  const [bg, color] = map[role] || ["#f1f5f9", "#64748b"];
  return (
    <span className="qm-role-pill" style={{ background: bg, color }}>
      {role}
    </span>
  );
}

/* ── Topbar (moved outside QuestionMaster to avoid re-creating on every render) ── */
function Topbar() {
  const navigate = useNavigate();
  const [pageName, setPageName] = useState("Admin");
  const [showMenu, setShowMenu] = useState(false);

  const handleLevelMaster = () => {
    setPageName("LevelMaster");
    setShowMenu(false);
    navigate("/LevelMaster");
  };

  return (
    <div className="qm-topbar" style={{ position: "relative" }}>
      <span className="qm-brand">KASSAPOS SOFTWARE SOLUTIONS</span>
      <div style={{ position: "relative" }}>
        <span
          className="qm-user"
          onClick={() => setShowMenu(!showMenu)}
          style={{ cursor: "pointer" }}
        >
          👤 {pageName} ▾
        </span>
        {showMenu && (
          <div
            style={{
              position: "absolute",
              top: "30px",
              right: 0,
              background: "#fff",
              border: "1px solid #ddd",
              borderRadius: "6px",
              boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
              zIndex: 1000,
            }}
          >
            <div
              onClick={handleLevelMaster}
              style={{ padding: "8px 16px", cursor: "pointer", whiteSpace: "nowrap" }}
            >
              📄 LevelMaster
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const ROLES = ["Support", "Implementation", "Sales"];

export default function QuestionMaster() {
  // ✅ All refs are now INSIDE the component (Rules of Hooks)
  const refs = {
    role:     useRef(),
    level:    useRef(),
    question: useRef(),
    remarks:  useRef(),
    optionA:  useRef(),
    optionB:  useRef(),
    optionC:  useRef(),
    optionD:  useRef(),
    answer:   useRef(),
  };

  const handleEnter = (e, nextRef) => {
    if (e.key === "Enter") {
      e.preventDefault();
      nextRef?.current?.focus();
    }
  };

  const [role, setRole]                         = useState("");
  const [levelMasterRefid, setLevelMasterRefid] = useState("");
  const [levels, setLevels]                     = useState([]);
  const [question, setQuestion]                 = useState("");
  const [qRemarks, setQRemarks]                 = useState("");
  const [imagePreview, setImagePreview]         = useState(null);
  const [selectedFile, setSelectedFile]         = useState(null);
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [optionA, setOptionA]                   = useState("");
  const [optionB, setOptionB]                   = useState("");
  const [optionC, setOptionC]                   = useState("");
  const [optionD, setOptionD]                   = useState("");
  const [answer, setAnswer]                     = useState("");
  const [orderBy, setOrderBy]                   = useState("");
  const [toast, setToast]                       = useState(null);
  const [rows, setRows]                         = useState([]);
  const [editId, setEditId]                     = useState(null);
  const [inputMode, setInputMode]               = useState("manual");
  const [loading, setLoading]                   = useState(false);
  const [zoomImg, setZoomImg]                   = useState(null);
  const [gridFilter, setGridFilter]             = useState("");

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ─── LOAD LEVELS ───────────────────────────────────────────
  const loadLevels = async () => {
    try {
      const res = await api("/SupportApp/SelectLevelMaster");
      if (res.IsSuccess && Array.isArray(res.Data3)) {
        setLevels(res.Data3.map(r => ({
          id:        r.Id        ?? r.id,
          levelName: r.LevelName ?? r.levelName,
          roleType:  r.RoleType  ?? r.roleType,
        })));
      }
    } catch {
      showToast("Could not load levels", "warn");
    }
  };

  // ─── LOAD QUESTIONS ────────────────────────────────────────
  const loadQuestions = async () => {
    setLoading(true);
    try {
      const res = await api("/SupportApp/SelectQuestionMaster");
      if (res.IsSuccess && Array.isArray(res.Data3)) {
        const mapped = res.Data3.map(r => ({
          id:               r.Id,
          LevelMasterRefid: r.LevelMasterRefid,
          levelName:        r.LevelName ?? "",
          role:             r.RoleType  ?? "",
          question:         r.Question  ?? "",
          qRemarks:         r.QuestionRemarks ?? "",
          optionA:          r.OptionA ?? "",
          optionB:          r.OptionB ?? "",
          optionC:          r.OptionC ?? "",
          optionD:          r.OptionD ?? "",
          answer:           r.Answer  ?? "",
          orderBy:          r.OrderBy ?? 0,
          inputMode:        r.OptionType === "option" ? "option" : "manual",
          imagePreview:     r.ExampleImg
            ? `${BASE_URL}/Upload/Admin/${r.ExampleImg.split("/").pop().split("\\").pop()}`
            : null,
          savedAt: r.Created_Date ?? "",
        }));
        setRows(mapped);
      } else {
        showToast(res.Message || "Failed to load questions", "warn");
      }
    } catch {
      showToast("Network error — could not load questions", "warn");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      await loadLevels();
      await loadQuestions();
    };
    init();
  }, []);

  const filteredLevels = role ? levels.filter(l => l.roleType === role) : levels;

  const filteredRows = gridFilter ? rows.filter(r => r.role === gridFilter) : rows;

  const roleCounts = rows.reduce((acc, r) => {
    acc[r.role] = (acc[r.role] || 0) + 1;
    return acc;
  }, {});

  // ─── IMAGE UPLOAD ──────────────────────────────────────────
  const handleUpload = async () => {
    if (!selectedFile) return;

    const localPreview = URL.createObjectURL(selectedFile);
    setImagePreview(localPreview);

    const formData = new FormData();
    formData.append("MyImages0", selectedFile);

    try {
      const res = await fetch(`${BASE_URL}/api/Commonapp/UploadFile`, {
        method: "POST",
        headers: { "FolderName": "Admin" },
        body: formData,
      });

      const result = await res.json();
      console.log("Upload response:", result);

      if (result.ok && result.data.length > 0) {
        const filePath = result.data[0];
        const fileNameOnly = filePath.split("/").pop().split("\\").pop();
        setUploadedFileName(fileNameOnly);
        setImagePreview(`${BASE_URL}/Upload/Admin/${fileNameOnly}`);
        showToast("Image uploaded successfully");
      } else {
        showToast("Upload failed", "warn");
        setImagePreview(null);
      }
    } catch (err) {
      console.error(err);
      showToast("Upload error", "warn");
      setImagePreview(null);
    }
  };

  // ─── SUBMIT ────────────────────────────────────────────────
  async function handleSubmit() {
    if (loading) return;

    if (!role || !levelMasterRefid || !question) {
      showToast("Please fill Role, Level and Question", "warn");
      return;
    }
    if (inputMode === "option" && !optionA) {
      showToast("Please fill at least Option A", "warn");
      return;
    }
    if (inputMode === "option" && !answer) {
      showToast("Please fill the Answer field", "warn");
      return;
    }

    setLoading(true);

    const body = {
      LevelMasterRefid: levelMasterRefid ? Number(levelMasterRefid) : null,
      RoleType:         role,
      Question:         question,
      QuestionRemarks:  qRemarks,
      ExampleImg:       uploadedFileName,
      OptionType:       inputMode,
      OptionA:          optionA,
      OptionB:          optionB,
      OptionC:          optionC,
      OptionD:          optionD,
      Answer:           answer,
      OrderBy:          Number(orderBy) || 0,
    };

    try {
      if (editId !== null) {
        const res = await api("/SupportApp/UpdateQuestionMaster", { Id: editId, ...body });
        if (res.IsSuccess) {
          await loadQuestions();
          showToast("Question updated successfully");
        } else {
          showToast(res.Message || "Update failed", "warn");
        }
      } else {
        const res = await api("/SupportApp/InsertQuestionMaster", body);
        if (res.IsSuccess) {
          await loadQuestions();
          showToast("Question saved successfully");
        } else {
          showToast(res.Message || "Insert failed", "warn");
        }
      }
    } catch {
      showToast("Network error", "warn");
    } finally {
      setLoading(false);
    }

    handleReset();
  }

  // ─── DELETE ────────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this question?")) return;
    try {
      const res = await api("/SupportApp/DeleteQuestionMaster", { Id: id });
      if (res.IsSuccess) {
        setRows(prev => prev.filter(x => x.id !== id));
        showToast("Question deleted");
      } else {
        showToast(res.Message || "Delete failed", "warn");
      }
    } catch {
      showToast("Network error", "warn");
    }
  };

  // ─── EDIT ──────────────────────────────────────────────────
  const handleEdit = (row) => {
    setEditId(row.id);
    setLevelMasterRefid(String(row.LevelMasterRefid));
    setQuestion(row.question);
    setQRemarks(row.qRemarks);
    setImagePreview(row.imagePreview);
    setOptionA(row.optionA ?? "");
    setOptionB(row.optionB ?? "");
    setOptionC(row.optionC ?? "");
    setOptionD(row.optionD ?? "");
    setAnswer(row.answer ?? "");
    setOrderBy(String(row.orderBy ?? ""));
    setInputMode(row.inputMode || "manual");
    setRole(row.role ?? "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ─── RESET ─────────────────────────────────────────────────
  const handleReset = () => {
    setEditId(null);
    setRole(""); setLevelMasterRefid(""); setQuestion(""); setQRemarks("");
    setImagePreview(null); setSelectedFile(null); setUploadedFileName("");
    setOptionA(""); setOptionB(""); setOptionC(""); setOptionD("");
    setAnswer(""); setOrderBy("");
    setInputMode("manual");
  };

  return (
    <div className="qm-root">

      <Topbar />

      {/* ── Page Title Strip ── */}
      <div className="qm-title-strip">
        <span>QUESTION DETAILS</span>
        {editId !== null && (
          <span className="qm-edit-badge">✏️ Editing #{editId}</span>
        )}
        <span className="qm-record-count">
          {rows.length} record{rows.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* ── Form Wrapper ── */}
      <div className="qm-form-wrapper">
        <div className="qm-panels">

          {/* ═══ LEFT PANEL ═══ */}
          <div className="qm-panel">
            <div className="qm-fields-col">
              <div className="qm-role-row">
                <Field label="Role *">
                  <div className="qm-select-wrap">
                    <select
                      className="qm-inp"
                      value={role}
                      onChange={e => { setRole(e.target.value); setLevelMasterRefid(""); }}
                      onKeyDown={e => handleEnter(e, refs.level)}
                      ref={refs.role}
                    >
                      <option value="">Select Role</option>
                      {ROLES.map(r => <option key={r}>{r}</option>)}
                    </select>
                    <span className="qm-select-arrow">▾</span>
                  </div>
                </Field>

                <Field label="Level Name *">
                  <select
                    className="qm-inp"
                    value={levelMasterRefid}
                    onChange={e => setLevelMasterRefid(e.target.value)}
                    ref={refs.level}
                    onKeyDown={e => handleEnter(e, refs.question)}
                  >
                    <option value="">Select Level</option>
                    {filteredLevels.map(l => (
                      <option key={l.id} value={l.id}>{l.levelName}</option>
                    ))}
                  </select>
                </Field>
              </div>

              <Field label="Question *">
                <textarea
                  className="qm-inp qm-textarea"
                  rows={3}
                  placeholder="Enter your question here..."
                  value={question}
                  onChange={e => setQuestion(e.target.value)}
                  ref={refs.question}
                  onKeyDown={e => handleEnter(e, refs.remarks)}
                />
              </Field>

              <Field label="Remarks">
                <input
                  className="qm-inp"
                  placeholder="Optional remarks or hints..."
                  value={qRemarks}
                  onChange={e => setQRemarks(e.target.value)}
                  ref={refs.remarks}
                  onKeyDown={e => handleEnter(e, refs.optionA)}
                />
              </Field>

              {/* ── Input Mode Toggle ── */}
              <div className="qm-mode-box">
                <div className="qm-sec-label">INPUT MODE</div>
                <div className="qm-mode-checks">
                  <label className="qm-check-label">
                    <span className="qm-custom-check">
                      <input type="radio" name="inputMode" value="option"
                        checked={inputMode === "option"}
                        onChange={() => setInputMode("option")}
                        className="qm-check-input" />
                      <span className={`qm-check-box ${inputMode === "option" ? "qm-check-box--active" : ""}`}>
                        {inputMode === "option" && <span className="qm-check-tick">✓</span>}
                      </span>
                    </span>
                    <span className="qm-check-text">Option Type</span>
                    <span className="qm-check-desc">Show A / B / C / D options</span>
                  </label>

                  <label className="qm-check-label">
                    <span className="qm-custom-check">
                      <input type="radio" name="inputMode" value="manual"
                        checked={inputMode === "manual"}
                        onChange={() => setInputMode("manual")}
                        className="qm-check-input" />
                      <span className={`qm-check-box ${inputMode === "manual" ? "qm-check-box--active" : ""}`}>
                        {inputMode === "manual" && <span className="qm-check-tick">✓</span>}
                      </span>
                    </span>
                    <span className="qm-check-text">Manual</span>
                    <span className="qm-check-desc">Free-text answer only</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="qm-actions">
              <button
                type="button"
                className="qm-btn qm-btn-save"
                onClick={handleSubmit}
                disabled={loading}
              >
                {editId !== null ? "✔ Update Question" : "+ Save Question"}
              </button>
              <button className="qm-btn qm-btn-reset" onClick={handleReset}>Reset</button>
            </div>
          </div>

          {/* ═══ RIGHT PANEL ═══ */}
          <div className="qm-panel">

            {/* ── Image Upload ── */}
            <Field label="Image (optional)">
              {imagePreview ? (
                <div className="qm-img-preview-wrap">
                  <img src={imagePreview} alt="preview" className="qm-img-preview" />
                  <div className="qm-img-actions">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={e => {
                        setSelectedFile(e.target.files[0]);
                        setImagePreview(URL.createObjectURL(e.target.files[0]));
                      }}
                      className="qm-file-picker"
                    />
                    <button
                      className="qm-btn qm-btn-upload-sm"
                      onClick={handleUpload}
                      disabled={!selectedFile || loading}
                    >
                      📤 Upload
                    </button>
                    <button
                      className="qm-btn qm-btn-remove"
                      onClick={() => { setImagePreview(null); setSelectedFile(null); setUploadedFileName(""); }}
                    >
                      ✕ Remove
                    </button>
                  </div>
                </div>
              ) : (
                <div className="qm-img-actions">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => {
                      setSelectedFile(e.target.files[0]);
                      setImagePreview(URL.createObjectURL(e.target.files[0]));
                    }}
                    className="qm-file-picker"
                  />
                  <button
                    className="qm-btn qm-btn-upload-sm"
                    onClick={handleUpload}
                    disabled={!selectedFile || loading}
                  >
                    📤 Upload
                  </button>
                </div>
              )}
            </Field>

            {/* ── OPTIONS & ANSWER ── */}
            {inputMode === "option" && (
              <>
                <div className="qm-options-box">
                  <div className="qm-sec-label">OPTIONS</div>
                  <div className="qm-opt-grid">
                    {[
                      ["A", optionA, setOptionA, refs.optionA, refs.optionB],
                      ["B", optionB, setOptionB, refs.optionB, refs.optionC],
                      ["C", optionC, setOptionC, refs.optionC, refs.optionD],
                      ["D", optionD, setOptionD, refs.optionD, refs.answer],
                    ].map(([ltr, val, fn, currRef, nextRef]) => (
                      <div key={ltr} className="qm-opt-row">
                        <span
                          className="qm-opt-badge"
                          style={{ background: BADGE_COLORS[ltr].bg, color: BADGE_COLORS[ltr].color }}
                        >
                          {ltr}
                        </span>
                        <input
                          className="qm-inp"
                          placeholder={`Option ${ltr}`}
                          value={val}
                          onChange={e => fn(e.target.value)}
                          ref={currRef}
                          onKeyDown={e => handleEnter(e, nextRef)}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="qm-answer-box">
                  <div className="qm-sec-label qm-sec-label--green">ANSWER</div>
                  <input
                    className="qm-inp qm-inp--green"
                    placeholder="Enter the correct answer (e.g. A, B, C or D)..."
                    value={answer}
                    onChange={e => setAnswer(e.target.value)}
                    ref={refs.answer}
                    onKeyDown={e => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleSubmit();
                      }
                    }}
                  />
                </div>
              </>
            )}

            {inputMode === "manual" && (
              <div className="qm-manual-hint">
                <span className="qm-manual-icon">✏️</span>
                <p className="qm-manual-text">No options required.</p>
                <p className="qm-manual-sub">Switch to <strong>Option Type</strong></p>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ── Grid Filter Bar ── */}
      <div className="qm-grid-wrapper">
        <div className="qm-filter-bar">
          <button
            className={`qm-filter-btn ${gridFilter === "" ? "qm-filter-btn--active" : ""}`}
            onClick={() => setGridFilter("")}
          >
            All <span className="qm-filter-count">{rows.length}</span>
          </button>

          {ROLES.map(r => (
            <button
              key={r}
              className={`qm-filter-btn qm-filter-btn--${r.toLowerCase()} ${gridFilter === r ? "qm-filter-btn--active" : ""}`}
              onClick={() => setGridFilter(prev => prev === r ? "" : r)}
            >
              {r === "Support" ? "🛡️" : r === "Implementation" ? "⚙️" : "📈"} {r}
              <span className="qm-filter-count">{roleCounts[r] || 0}</span>
            </button>
          ))}

          <span className="qm-filter-info">
            Showing {filteredRows.length} of {rows.length} entr{filteredRows.length === 1 ? "y" : "ies"}
            {gridFilter ? ` · ${gridFilter}` : ""}
          </span>
        </div>

        {/* ── Data Table ── */}
        <table className="qm-table">
          <thead>
            <tr>
              {["S.No","Actions","ID","Role","Name","Question","Options","Answer","Remarks","Image","Saved"].map(h => (
                <th key={h} className="qm-th">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={11} className="qm-no-data">
                  {gridFilter ? `No ${gridFilter} questions found.` : "No data to display"}
                </td>
              </tr>
            ) : filteredRows.map((row, i) => (
              <tr key={row.id} className={`qm-tr ${i % 2 === 0 ? "qm-tr--even" : "qm-tr--odd"}`}>

                <td className="qm-td qm-td--center qm-td--muted">{i + 1}</td>

                <td className="qm-td qm-td--nowrap">
                  <button className="qm-btn qm-btn-edit" onClick={() => handleEdit(row)}>✏️ Edit</button>
                  {" "}
                  <button className="qm-btn qm-btn-del" onClick={() => handleDelete(row.id)}>🗑️ Del</button>
                </td>

                <td className="qm-td">
                  <span className="qm-ticket-badge">#{row.id}</span>
                </td>

                <td className="qm-td"><RolePill role={row.role} /></td>

                <td className="qm-td qm-td--nowrap">{row.levelName}</td>

                <td className="qm-td qm-td--question">
                  <span title={row.question} className="qm-question-text">{row.question}</span>
                </td>

                <td className="qm-td qm-td--options">
                  <div className="qm-option-pills">
                    {[["A", row.optionA], ["B", row.optionB], ["C", row.optionC], ["D", row.optionD]]
                      .filter(([, v]) => v)
                      .map(([ltr, val]) => (
                        <span
                          key={ltr}
                          className="qm-opt-pill"
                          style={{ background: BADGE_COLORS[ltr].bg, color: BADGE_COLORS[ltr].color }}
                        >
                          <b>{ltr}:</b> {val}
                        </span>
                      ))}
                  </div>
                </td>

                <td className="qm-td">
                  <span className="qm-answer-pill">{row.answer || "—"}</span>
                </td>

                <td className="qm-td qm-td--muted">{row.qRemarks || "—"}</td>

                <td className="qm-td qm-td--center">
                  {row.imagePreview
                    ? <img
                        src={row.imagePreview}
                        alt=""
                        className="qm-grid-img"
                        title="Double-click to zoom"
                        style={{ cursor: "zoom-in" }}
                        onDoubleClick={() => setZoomImg(row.imagePreview)}
                      />
                    : <span className="qm-td--faint">—</span>}
                </td>

                <td className="qm-td qm-td--timestamp">{row.savedAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Image Zoom Modal ── */}
      {zoomImg && (
        <div
          onClick={() => setZoomImg(null)}
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "rgba(0,0,0,0.82)",
            display: "flex", alignItems: "center", justifyContent: "center",
            backdropFilter: "blur(6px)",
            cursor: "zoom-out",
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}
          >
            <img
              src={zoomImg}
              alt="Zoomed"
              style={{
                maxWidth: "88vw", maxHeight: "82vh",
                borderRadius: 12, objectFit: "contain",
                boxShadow: "0 8px 48px rgba(0,0,0,0.6)",
                background: "#fff",
              }}
            />
            <button
              onClick={() => setZoomImg(null)}
              style={{
                padding: "8px 28px", borderRadius: 8,
                border: "none", background: "#fff",
                color: "#111", fontWeight: 700,
                fontSize: "0.85rem", cursor: "pointer",
                boxShadow: "0 2px 12px rgba(0,0,0,0.3)",
              }}
            >
              ✕ Close
            </button>
          </div>
        </div>
      )}

      {/* ── Toast ── */}
      {toast && (
        <div className={`qm-toast ${toast.type === "warn" ? "qm-toast--warn" : "qm-toast--success"}`}>
          <span>{toast.type === "warn" ? "⚠️" : "✅"}</span>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
