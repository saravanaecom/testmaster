import { useState, useEffect, useRef } from "react";
import "../QuestionMaster.css";
import AdminLayout from "../components/AdminLayout";

const BADGE_COLORS = {
  A: { bg: "#dbeafe", color: "#1d4ed8" },
  B: { bg: "#dcfce7", color: "#15803d" },
  C: { bg: "#fef9c3", color: "#a16207" },
  D: { bg: "#fee2e2", color: "#b91c1c" },
};

//const BASE_URL = "http://localhost:44300";  // no trailing slash

const BASE_URL = "https://testapi.kassapos.co.in";

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

const ROLE_ICON = {
  Support: "🛡️",
  Implementation: "⚙️",
  Sales: "📈",
};

const ROLE_STYLE = {
  Support:        { active: "#1d4ed8", activeBg: "#dbeafe", dot: "#1d4ed8" },
  Implementation: { active: "#a16207", activeBg: "#fef9c3", dot: "#a16207" },
  Sales:          { active: "#15803d", activeBg: "#dcfce7", dot: "#15803d" },
};

// ─────────────────────────────────────────────────────────────────
//  MULTI-IMAGE UPLOAD COMPONENT
//  - selectedFiles   : files chosen but not yet uploaded (local preview)
//  - uploadedNames   : filenames already saved on server (from DB or upload)
//  - onUploaded      : callback(namesArray) → parent stores the names
//  - onRemoveSaved   : callback(name) → parent removes from saved list
//  - editId          : current question Id (used as folder Id header)
//  - loading         : global loading flag
//  - onZoom          : callback(url) → opens zoom modal
// -----------------------------------------------------------------
function MultiImageUpload({
  selectedFiles,
  setSelectedFiles,
  uploadedNames,
  setUploadedNames,
  editId,
  loading,
  onZoom,
  showToast,
}) {
  const fileInputRef = useRef();

  // Pick files — append to existing selection
  const handleFileChange = (e) => {
    const newFiles = Array.from(e.target.files);
    setSelectedFiles((prev) => [...prev, ...newFiles]);
    // Reset input so same file can be re-added if removed
    e.target.value = "";
  };

  // Remove a locally-selected (not yet uploaded) file
  const removeSelected = (idx) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  // Remove an already-uploaded (saved) file name
  const removeSaved = (name) => {
    setUploadedNames((prev) => prev.filter((n) => n !== name));
  };

  // Upload all selected files to server
  const handleUpload = async () => {
    if (!selectedFiles.length) return;

    const formData = new FormData();
    selectedFiles.forEach((file, i) => {
      formData.append(`MyImages${i}`, file);
    });

    try {
      const res = await fetch(`${BASE_URL}/api/Commonapp/UploadFile`, {
        method: "POST",
        headers: {
          FolderName: "Questions",
          Id: String(editId || 0),
        },
        body: formData,
      });
      const result = await res.json();

      if (result.ok && result.data.length > 0) {
        const names = result.data.map((p) =>
          p.split("/").pop().split("\\").pop()
        );
        // Merge new names with already-saved names (avoid duplicates)
        setUploadedNames((prev) => {
          const merged = [...prev];
          names.forEach((n) => { if (!merged.includes(n)) merged.push(n); });
          return merged;
        });
        setSelectedFiles([]); // clear pending selection after upload
        showToast(`✅ ${names.length} image(s) uploaded successfully`);
      } else {
        showToast("Upload failed", "warn");
      }
    } catch (err) {
      console.error(err);
      showToast("Upload error", "warn");
    }
  };

  const totalSelected = selectedFiles.length;
  const totalSaved    = uploadedNames.length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

      {/* ── Picker row ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          style={{
            padding: "6px 14px",
            borderRadius: 7,
            border: "1.5px dashed #94a3b8",
            background: "#f8fafc",
            color: "#475569",
            fontSize: "0.8rem",
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          🖼️ Choose Images
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: "none" }}
          onChange={handleFileChange}
        />

        <button
          type="button"
          className="qm-btn qm-btn-upload-sm"
          onClick={handleUpload}
          disabled={!totalSelected || loading}
          style={{ opacity: !totalSelected || loading ? 0.5 : 1 }}
        >
          📤 Upload {totalSelected > 0 ? `(${totalSelected})` : ""}
        </button>

        {totalSelected > 0 && (
          <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
            {totalSelected} file{totalSelected > 1 ? "s" : ""} ready to upload
          </span>
        )}
      </div>

      {/* ── Local preview thumbnails (not yet uploaded) ── */}
      {totalSelected > 0 && (
        <div>
          <div style={{
            fontSize: "0.7rem", fontWeight: 700, color: "#94a3b8",
            letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6,
          }}>
            Pending Upload
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {selectedFiles.map((file, idx) => (
              <div key={idx} style={{ position: "relative", width: 80, height: 80 }}>
                <img
                  src={URL.createObjectURL(file)}
                  alt={`pending-${idx}`}
                  style={{
                    width: 80, height: 80, objectFit: "cover",
                    borderRadius: 8,
                    border: "2px dashed #f59e0b",
                    cursor: "zoom-in",
                  }}
                  onDoubleClick={() => onZoom(URL.createObjectURL(file))}
                  title="Double-click to zoom"
                />
                {/* Filename tooltip */}
                <div style={{
                  position: "absolute", bottom: 0, left: 0, right: 0,
                  background: "rgba(245,158,11,0.85)", color: "#fff",
                  fontSize: "0.5rem", padding: "2px 3px",
                  borderRadius: "0 0 6px 6px",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  textAlign: "center",
                }}>
                  ⏳ {file.name}
                </div>
                {/* Remove button */}
                <button
                  type="button"
                  onClick={() => removeSelected(idx)}
                  style={{
                    position: "absolute", top: -7, right: -7,
                    background: "#ef4444", color: "#fff",
                    border: "2px solid #fff", borderRadius: "50%",
                    width: 20, height: 20, cursor: "pointer",
                    fontSize: "0.65rem", fontWeight: 800,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    padding: 0, lineHeight: 1,
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Saved/uploaded thumbnails (from server) ── */}
      {totalSaved > 0 && (
        <div>
          <div style={{
            fontSize: "0.7rem", fontWeight: 700, color: "#94a3b8",
            letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6,
          }}>
            Saved ({totalSaved})
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {uploadedNames.map((name, idx) => (
              <div key={idx} style={{ position: "relative", width: 80, height: 80 }}>
                <img
                  src={`${BASE_URL}/Upload/Questions/${name}`}
                  alt={name}
                  style={{
                    width: 80, height: 80, objectFit: "cover",
                    borderRadius: 8,
                    border: "2px solid #22c55e",
                    cursor: "zoom-in",
                  }}
                  onDoubleClick={() => onZoom(`${BASE_URL}/Upload/Questions/${name}`)}
                  title="Double-click to zoom"
                  onError={(e) => {
                    // fallback if image not found
                    e.target.style.display = "none";
                  }}
                />
                {/* Saved label */}
                <div style={{
                  position: "absolute", bottom: 0, left: 0, right: 0,
                  background: "rgba(34,197,94,0.85)", color: "#fff",
                  fontSize: "0.5rem", padding: "2px 3px",
                  borderRadius: "0 0 6px 6px",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  textAlign: "center",
                }}>
                  ✅ {name}
                </div>
                {/* Remove button */}
                <button
                  type="button"
                  onClick={() => removeSaved(name)}
                  style={{
                    position: "absolute", top: -7, right: -7,
                    background: "#ef4444", color: "#fff",
                    border: "2px solid #fff", borderRadius: "50%",
                    width: 20, height: 20, cursor: "pointer",
                    fontSize: "0.65rem", fontWeight: 800,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    padding: 0, lineHeight: 1,
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {totalSelected === 0 && totalSaved === 0 && (
        <div style={{
          border: "1.5px dashed #e2e8f0", borderRadius: 8,
          padding: "18px 12px", textAlign: "center",
          color: "#94a3b8", fontSize: "0.78rem",
        }}>
          🖼️ No images added yet. Click "Choose Images" to add.
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  MAIN COMPONENT
// -----------------------------------------------------------------
export default function QuestionMaster() {
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

  // ── Form state ──
  const [roleMasterRefid, setRoleMasterRefid]   = useState("");
  const [levelMasterRefid, setLevelMasterRefid] = useState("");
  const [roles, setRoles]                       = useState([]);
  const [levels, setLevels]                     = useState([]);
  const [question, setQuestion]                 = useState("");
  const [qRemarks, setQRemarks]                 = useState("");
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

  // ── MULTI-IMAGE state (replaces old single-image state) ──
  // selectedFiles  → files chosen locally, not yet uploaded
  // uploadedNames  → filenames saved on server (comma-joined before API call)
  const [selectedFiles, setSelectedFiles]   = useState([]);   // File[]
  const [uploadedNames, setUploadedNames]   = useState([]);   // string[]

  // ── Drill-down filter state ──
  const [filterRole, setFilterRole]   = useState("");
  const [filterLevel, setFilterLevel] = useState("");

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ── LOAD ROLES ───────────────────────────────────────────
  // const loadRoles = async () => {
  //   try {
  //     const res = await fetch(`${BASE_URL}/api/SupportApp/GetRoles`, {
  //       method: "GET",
  //       headers: { "Content-Type": "application/json" },
  //     });
  //     if (!res.ok) {
  //       console.error("GetRoles HTTP Error:", res.status);
  //       return;
  //     }
  //     const data = await res.json();
  //     if (data.IsSuccess && Array.isArray(data.Data3)) {
  //       setRoles(data.Data3.map((r) => ({ id: r.Id, roleName: r.RoleName })));
  //     }
  //   } catch (err) {
  //     console.error("GetRoles error:", err);
  //     showToast("Could not load roles", "warn");
  //   }
  // };
  const loadRoles = async () => {
    try {
      // FIX: was method:"GET" → HTTP 405. All endpoints require POST.
      const data = await api("/SupportApp/GetRoles");
      if (data.IsSuccess && Array.isArray(data.Data3)) {
        setRoles(data.Data3.map((r) => ({ id: r.Id, roleName: r.RoleName })));
      } else {
        console.error("GetRoles failed:", data.Message);
        showToast("Could not load roles", "warn");
      }
    } catch (err) {
      console.error("GetRoles error:", err);
      showToast("Could not load roles", "warn");
    }
  };

  // ── LOAD LEVELS ──────────────────────────────────────────
  const loadLevels = async () => {
    try {
      // SelectLevelMaster takes no parameters — send null body, not {}
      const res = await fetch(`${BASE_URL}/api/SupportApp/SelectLevelMaster`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      if (!res.ok) {
        console.error("SelectLevelMaster HTTP Error:", res.status);
        return;
      }
      const data = await res.json();
      if (data.IsSuccess && Array.isArray(data.Data3)) {
        setLevels(
          data.Data3.map((r) => ({
            id:              r.Id              ?? r.id,
            levelName:       r.LevelName       ?? r.levelName,
            roleMasterRefid: r.RoleMasterRefid ?? r.roleMasterRefid,
            roleName:        r.RoleName        ?? r.roleName ?? "",
          }))
        );
      }
    } catch (err) {
      console.error("SelectLevelMaster error:", err);
      showToast("Could not load levels", "warn");
    }
  };

  // ── LOAD QUESTIONS ───────────────────────────────────────
  const loadQuestions = async () => {
    setLoading(true);
    try {
      // Send empty model — service will use the "no filter" branch
      const res = await api("/SupportApp/SelectQuestionMaster", {});
      if (res.IsSuccess && Array.isArray(res.Data3) && res.Data3.length > 0) {
        const mapped = res.Data3.map((r) => {
          // ExampleImg can be comma-separated filenames stored in DB
          const rawImg = r.ExampleImg ?? "";
          const imageNames = rawImg
            ? rawImg
                .split(",")
                .map((p) => p.trim().split("/").pop().split("\\").pop())
                .filter(Boolean)
            : [];

          return {
            id:               r.Id,
            LevelMasterRefid: r.LevelMasterRefid,
            levelName:        r.LevelName       ?? "",
            roleMasterRefid:  r.RoleMasterRefid ?? 0,
            role:             r.RoleName        ?? "",
            question:         r.Question        ?? "",
            qRemarks:         r.QuestionRemarks ?? "",
            optionA:          r.OptionA         ?? "",
            optionB:          r.OptionB         ?? "",
            optionC:          r.OptionC         ?? "",
            optionD:          r.OptionD         ?? "",
            answer:           r.Answer          ?? "",
            orderBy:          r.OrderBy         ?? 0,
            inputMode:        r.OptionType === "option" ? "option" : "manual",
            imageNames,          // ← array of filenames
            savedAt:          r.Created_Date ?? "",
          };
        });
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
      await loadRoles();
      await loadLevels();
      await loadQuestions();
    };
    init();
  }, []);

  // ── DERIVED FILTER DATA ──────────────────────────────────
  const filterLevelsForRole = filterRole
    ? levels.filter((l) => String(l.roleMasterRefid) === String(filterRole))
    : [];

  const roleCounts = rows.reduce((acc, r) => {
    const key = String(r.roleMasterRefid);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const filteredRows = rows.filter((r) => {
    if (filterRole  && String(r.roleMasterRefid)  !== String(filterRole))  return false;
    if (filterLevel && String(r.LevelMasterRefid) !== String(filterLevel)) return false;
    return true;
  });

  const filteredLevels = roleMasterRefid
    ? levels.filter((l) => String(l.roleMasterRefid) === String(roleMasterRefid))
    : levels;

  // ── SUBMIT ───────────────────────────────────────────────
  async function handleSubmit() {
    if (loading) return;
    if (!roleMasterRefid || !levelMasterRefid || !question) {
      showToast("Please fill Role, Level and Question", "warn"); return;
    }
    if (inputMode === "option" && !optionA) {
      showToast("Please fill at least Option A", "warn"); return;
    }
    if (inputMode === "option" && !answer) {
      showToast("Please fill the Answer field", "warn"); return;
    }

    setLoading(true);

    // Join all saved image names as comma-separated for DB storage
    const exampleImgValue = uploadedNames.join(",");

    const body = {
      LevelMasterRefid: levelMasterRefid ? Number(levelMasterRefid) : null,
      RoleMasterRefid:  roleMasterRefid  ? Number(roleMasterRefid)  : null,
      Question:         question,
      QuestionRemarks:  qRemarks,
      ExampleImg:       exampleImgValue,   // comma-separated filenames
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
        const res = await api("/SupportApp/UpdateQuestionMaster", { Id: Number(editId), ...body });
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

  // ── DELETE ───────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this question?")) return;
    try {
      const res = await api("/SupportApp/DeleteQuestionMaster", { Id: id });
      if (res.IsSuccess) {
        setRows((prev) => prev.filter((x) => x.id !== id));
        showToast("Question deleted");
      } else {
        showToast(res.Message || "Delete failed", "warn");
      }
    } catch {
      showToast("Network error", "warn");
    }
  };

  // ── EDIT ─────────────────────────────────────────────────
  const handleEdit = (row) => {
    setEditId(row.id);
    setLevelMasterRefid(String(row.LevelMasterRefid));
    setQuestion(row.question);
    setQRemarks(row.qRemarks);
    setOptionA(row.optionA ?? "");
    setOptionB(row.optionB ?? "");
    setOptionC(row.optionC ?? "");
    setOptionD(row.optionD ?? "");
    setAnswer(row.answer ?? "");
    setOrderBy(String(row.orderBy ?? ""));
    setInputMode(row.inputMode || "manual");
    setRoleMasterRefid(String(row.roleMasterRefid ?? ""));

    // Restore saved image names; clear any pending local files
    setUploadedNames(row.imageNames ?? []);
    setSelectedFiles([]);

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ── RESET ────────────────────────────────────────────────
  const handleReset = () => {
    setEditId(null);
    setRoleMasterRefid("");
    setLevelMasterRefid("");
    setQuestion("");
    setQRemarks("");
    setOptionA("");
    setOptionB("");
    setOptionC("");
    setOptionD("");
    setAnswer("");
    setOrderBy("");
    setInputMode("manual");
    // Reset image state
    setSelectedFiles([]);
    setUploadedNames([]);
  };

  // ── RENDER ───────────────────────────────────────────────
  return (
    <AdminLayout title="QUESTION DETAILS" recordCount={rows.length} editId={editId}>

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
                      value={roleMasterRefid}
                      onChange={(e) => {
                        setRoleMasterRefid(e.target.value);
                        setLevelMasterRefid("");
                      }}
                      onKeyDown={(e) => handleEnter(e, refs.level)}
                      ref={refs.role}
                    >
                      <option value="">Select Role</option>
                      {roles.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.roleName}
                        </option>
                      ))}
                    </select>
                    <span className="qm-select-arrow">▾</span>
                  </div>
                </Field>

                <Field label="Level Name *">
                  <select
                    className="qm-inp"
                    value={levelMasterRefid}
                    onChange={(e) => setLevelMasterRefid(e.target.value)}
                    ref={refs.level}
                    onKeyDown={(e) => handleEnter(e, refs.question)}
                  >
                    <option value="">Select Level</option>
                    {filteredLevels.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.levelName}
                      </option>
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
                  onChange={(e) => setQuestion(e.target.value)}
                  ref={refs.question}
                  onKeyDown={(e) => handleEnter(e, refs.remarks)}
                />
              </Field>

              <Field label="Remarks">
                <input
                  className="qm-inp"
                  placeholder="Optional remarks or hints..."
                  value={qRemarks}
                  onChange={(e) => setQRemarks(e.target.value)}
                  ref={refs.remarks}
                  onKeyDown={(e) => handleEnter(e, refs.optionA)}
                />
              </Field>

              {/* ── Input Mode Toggle ── */}
              <div className="qm-mode-box">
                <div className="qm-sec-label">INPUT MODE</div>
                <div className="qm-mode-checks">
                  <label className="qm-check-label">
                    <span className="qm-custom-check">
                      <input
                        type="radio"
                        name="inputMode"
                        value="option"
                        checked={inputMode === "option"}
                        onChange={() => setInputMode("option")}
                        className="qm-check-input"
                      />
                      <span
                        className={`qm-check-box ${inputMode === "option" ? "qm-check-box--active" : ""}`}
                      >
                        {inputMode === "option" && (
                          <span className="qm-check-tick">✓</span>
                        )}
                      </span>
                    </span>
                    <span className="qm-check-text">Option Type</span>
                    <span className="qm-check-desc">Show A / B / C / D options</span>
                  </label>

                  <label className="qm-check-label">
                    <span className="qm-custom-check">
                      <input
                        type="radio"
                        name="inputMode"
                        value="manual"
                        checked={inputMode === "manual"}
                        onChange={() => setInputMode("manual")}
                        className="qm-check-input"
                      />
                      <span
                        className={`qm-check-box ${inputMode === "manual" ? "qm-check-box--active" : ""}`}
                      >
                        {inputMode === "manual" && (
                          <span className="qm-check-tick">✓</span>
                        )}
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
              <button className="qm-btn qm-btn-reset" onClick={handleReset}>
                Reset
              </button>
            </div>
          </div>

          {/* ═══ RIGHT PANEL ═══ */}
          <div className="qm-panel">

            {/* ── MULTI-IMAGE UPLOAD ── */}
            <Field label="Images (optional)">
              <MultiImageUpload
                selectedFiles={selectedFiles}
                setSelectedFiles={setSelectedFiles}
                uploadedNames={uploadedNames}
                setUploadedNames={setUploadedNames}
                editId={editId}
                loading={loading}
                onZoom={setZoomImg}
                showToast={showToast}
              />
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
                          style={{
                            background: BADGE_COLORS[ltr].bg,
                            color: BADGE_COLORS[ltr].color,
                          }}
                        >
                          {ltr}
                        </span>
                        <input
                          className="qm-inp"
                          placeholder={`Option ${ltr}`}
                          value={val}
                          onChange={(e) => fn(e.target.value)}
                          ref={currRef}
                          onKeyDown={(e) => handleEnter(e, nextRef)}
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
                    onChange={(e) => setAnswer(e.target.value)}
                    ref={refs.answer}
                    onKeyDown={(e) => {
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
                <p className="qm-manual-sub">
                  Switch to <strong>Option Type</strong>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          DRILL-DOWN FILTER BAR
      ══════════════════════════════════════════════════════ */}
      <div className="qm-grid-wrapper">

        {/* ── STEP 1: Role Filter ── */}
        <div className="qm-filter-bar">
          <button
            className={`qm-filter-btn ${filterRole === "" ? "qm-filter-btn--active" : ""}`}
            onClick={() => { setFilterRole(""); setFilterLevel(""); }}
          >
            All <span className="qm-filter-count">{rows.length}</span>
          </button>

          {roles.map((r) => {
            const key      = String(r.id);
            const isActive = filterRole === key;
            return (
              <button
                key={key}
                className={`qm-filter-btn qm-filter-btn--${r.roleName.toLowerCase()} ${
                  isActive ? "qm-filter-btn--active" : ""
                }`}
                onClick={() => {
                  if (filterRole === key) {
                    setFilterRole("");
                    setFilterLevel("");
                  } else {
                    setFilterRole(key);
                    setFilterLevel("");
                  }
                }}
              >
                {ROLE_ICON[r.roleName] || "🔷"} {r.roleName}
                <span className="qm-filter-count">{roleCounts[key] || 0}</span>
              </button>
            );
          })}

          <span className="qm-filter-info">
            Showing {filteredRows.length} of {rows.length} entr
            {filteredRows.length === 1 ? "y" : "ies"}
            {filterRole
              ? ` · ${roles.find((r) => String(r.id) === filterRole)?.roleName ?? ""}`
              : ""}
            {filterLevel
              ? ` · ${
                  levels.find((l) => String(l.id) === String(filterLevel))?.levelName ?? ""
                }`
              : ""}
          </span>
        </div>

        {/* ── STEP 2: Level Filter ── */}
        {filterRole && filterLevelsForRole.length > 0 && (
          <div
            className="qm-filter-bar qm-filter-bar--level"
            style={{
              marginTop: 0,
              borderTop: "1px solid #e2e8f0",
              background: "#f8fafc",
              paddingTop: 10,
              paddingBottom: 10,
            }}
          >
            <span
              style={{
                fontSize: "0.72rem",
                fontWeight: 700,
                color: "#64748b",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                marginRight: 4,
                alignSelf: "center",
              }}
            >
              Level:
            </span>

            <button
              className={`qm-filter-btn ${filterLevel === "" ? "qm-filter-btn--active" : ""}`}
              onClick={() => setFilterLevel("")}
              style={{ fontSize: "0.78rem", padding: "4px 12px" }}
            >
              All Levels
              <span className="qm-filter-count">
                {rows.filter((r) => String(r.roleMasterRefid) === filterRole).length}
              </span>
            </button>

            {filterLevelsForRole.map((lv) => {
              const count = rows.filter(
                (r) =>
                  String(r.roleMasterRefid) === filterRole &&
                  String(r.LevelMasterRefid) === String(lv.id)
              ).length;
              const isActive = String(filterLevel) === String(lv.id);
              return (
                <button
                  key={lv.id}
                  className={`qm-filter-btn ${isActive ? "qm-filter-btn--active" : ""}`}
                  onClick={() => setFilterLevel(isActive ? "" : String(lv.id))}
                  style={{
                    fontSize: "0.78rem",
                    padding: "4px 12px",
                    background: isActive ? "#0f172a" : "#fff",
                    color: isActive ? "#fff" : "#334155",
                    border: "1px solid #cbd5e1",
                  }}
                >
                  {lv.levelName}
                  <span
                    className="qm-filter-count"
                    style={{
                      background: isActive ? "rgba(255,255,255,0.2)" : "#e2e8f0",
                      color: isActive ? "#fff" : "#475569",
                    }}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* ── Data Table ── */}
        <table className="qm-table">
          <thead>
            <tr>
              {[
                "S.No","Actions","ID","Role","Name",
                "Question","Options","Answer","Remarks","Images","Saved",
              ].map((h) => (
                <th key={h} className="qm-th">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={11} className="qm-no-data">
                  {filterRole
                    ? filterLevel
                      ? `No questions found for ${
                          roles.find((r) => String(r.id) === filterRole)?.roleName
                        } — ${
                          levels.find((l) => String(l.id) === String(filterLevel))
                            ?.levelName ?? "this level"
                        }.`
                      : `No ${
                          roles.find((r) => String(r.id) === filterRole)?.roleName
                        } questions found.`
                    : "No data to display"}
                </td>
              </tr>
            ) : (
              filteredRows.map((row, i) => (
                <tr
                  key={row.id}
                  className={`qm-tr ${i % 2 === 0 ? "qm-tr--even" : "qm-tr--odd"}`}
                >
                  <td className="qm-td qm-td--center qm-td--muted">{i + 1}</td>
                  <td className="qm-td qm-td--nowrap">
                    <button
                      className="qm-btn qm-btn-edit"
                      onClick={() => handleEdit(row)}
                    >
                      ✏️ Edit
                    </button>{" "}
                    <button
                      className="qm-btn qm-btn-del"
                      onClick={() => handleDelete(row.id)}
                    >
                      🗑️ Del
                    </button>
                  </td>
                  <td className="qm-td">
                    <span className="qm-ticket-badge">#{row.id}</span>
                  </td>
                  <td className="qm-td">
                    <RolePill role={row.role} />
                  </td>
                  <td className="qm-td qm-td--nowrap">{row.levelName}</td>
                  <td className="qm-td qm-td--question">
                    <span title={row.question} className="qm-question-text">
                      {row.question}
                    </span>
                  </td>
                  <td className="qm-td qm-td--options">
                    <div className="qm-option-pills">
                      {[
                        ["A", row.optionA],
                        ["B", row.optionB],
                        ["C", row.optionC],
                        ["D", row.optionD],
                      ]
                        .filter(([, v]) => v)
                        .map(([ltr, val]) => (
                          <span
                            key={ltr}
                            className="qm-opt-pill"
                            style={{
                              background: BADGE_COLORS[ltr].bg,
                              color: BADGE_COLORS[ltr].color,
                            }}
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

                  {/* ── Images cell ── */}
                  <td className="qm-td qm-td--center">
                    {row.imageNames && row.imageNames.length > 0 ? (
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                        <div style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 5,
                          justifyContent: "center",
                          maxWidth: row.imageNames.length === 1 ? 56 : 120,
                        }}>
                          {row.imageNames.map((name, idx) => {
                            const imgUrl = `${BASE_URL}/Upload/Questions/${row.id}/${name}`;
                            return (
                              <div
                                key={idx}
                                title={`${name} — Double-click to zoom`}
                                onDoubleClick={() => setZoomImg(imgUrl)}
                                style={{
                                  width: 52,
                                  height: 52,
                                  borderRadius: 7,
                                  overflow: "hidden",
                                  border: "1.5px solid #cbd5e1",
                                  background: "#f1f5f9",
                                  cursor: "zoom-in",
                                  flexShrink: 0,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  position: "relative",
                                }}
                              >
                                <img
                                  src={imgUrl}
                                  alt={name}
                                  style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                    display: "block",
                                  }}
                                  onError={(e) => {
                                    e.target.style.display = "none";
                                    e.target.nextSibling.style.display = "flex";
                                  }}
                                />
                                {/* Fallback shown when image fails */}
                                <div style={{
                                  display: "none",
                                  position: "absolute", inset: 0,
                                  flexDirection: "column",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: "1.2rem",
                                  color: "#94a3b8",
                                  background: "#f8fafc",
                                  gap: 2,
                                }}>
                                  🖼️
                                  <span style={{ fontSize: "0.45rem", color: "#94a3b8", textAlign: "center", padding: "0 2px", wordBreak: "break-all" }}>
                                    {name.length > 10 ? name.slice(0, 10) + "…" : name}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        {row.imageNames.length > 1 && (
                          <span style={{
                            fontSize: "0.62rem",
                            color: "#3b82f6",
                            background: "#eff6ff",
                            border: "1px solid #bfdbfe",
                            borderRadius: 4,
                            padding: "1px 7px",
                            fontWeight: 700,
                          }}>
                            {row.imageNames.length} imgs
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="qm-td--faint">—</span>
                    )}
                  </td>

                  <td className="qm-td qm-td--timestamp">{row.savedAt}</td>
                </tr>
              ))
            )}
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
            backdropFilter: "blur(6px)", cursor: "zoom-out",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              display: "flex", flexDirection: "column",
              alignItems: "center", gap: 14,
            }}
          >
            <img
              src={zoomImg}
              alt="Zoomed"
              style={{
                maxWidth: "88vw", maxHeight: "82vh", borderRadius: 12,
                objectFit: "contain",
                boxShadow: "0 8px 48px rgba(0,0,0,0.6)",
                background: "#fff",
              }}
            />
            <button
              onClick={() => setZoomImg(null)}
              style={{
                padding: "8px 28px", borderRadius: 8, border: "none",
                background: "#fff", color: "#111", fontWeight: 700,
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
        <div
          className={`qm-toast ${
            toast.type === "warn" ? "qm-toast--warn" : "qm-toast--success"
          }`}
        >
          <span>{toast.type === "warn" ? "⚠️" : "✅"}</span>
          {toast.msg}
        </div>
      )}
    </AdminLayout>
  );
}
