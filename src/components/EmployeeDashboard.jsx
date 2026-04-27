import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import DashboardHeader from "./DashboardHeader";
import "../EmployeeDashboard.css";

// ─────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────
//const API_BASE = "http://localhost:44300/api/SupportApp";

const API_BASE = "https://testapi.kassapos.co.in/api/SupportApp";

// ─────────────────────────────────────────────────────────────────
// STATUS HELPERS
// ─────────────────────────────────────────────────────────────────

/**
 * Given SelectTestReview rows, returns map: LevelName → highest-priority status string.
 * Priority: Promoted > Submitted > ReExam > Approved
 */
export function computeLevelStatuses(testRows) {
  const rank = (s) => {
    if (s === "Promoted")  return 4;
    if (s === "Submitted") return 3;
    if (s === "ReExam")    return 2;
    if (s === "Approved")  return 1;
    return 0;
  };
  const map = {};
  for (const row of testRows) {
    const levelName = row.LevelName;
    const status    = row.RowTestStatus ?? row.TestStatus ?? "";
    if (!levelName) continue;
    if (!map[levelName] || rank(status) > rank(map[levelName])) {
      map[levelName] = status;
    }
  }
  return map;
}

/**
 * Resolve the display status for one level card.
 */
export function resolveLevelStatus(lvl, employee, statusByLevel, index) {
  const raw = statusByLevel[lvl.LevelName];
  if (raw === "Promoted")  return "completed";
  if (raw === "Submitted") return "pending";
  if (raw === "ReExam")    return "reexam";

  const currentLevelId = employee.LevelMasterRefid ?? null;
  if (currentLevelId === null) return index === 0 ? "active" : "locked";
  if (lvl.Id < currentLevelId)  return "completed";
  if (lvl.Id === currentLevelId) return "active";
  return "locked";
}

export const STATUS_META = {
  completed: { label: "Completed",      colorKey: "green"  },
  pending:   { label: "Pending Review", colorKey: "yellow" },
  reexam:    { label: "Re-Exam",        colorKey: "orange" },
  active:    { label: "Unlocked",       colorKey: "blue"   },
  locked:    { label: "Locked",         colorKey: "grey"   },
};

// ─────────────────────────────────────────────────────────────────
// ICONS
// ─────────────────────────────────────────────────────────────────
const IcoCheck = () => (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="none"
    stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3,8 6.5,11.5 13,5" />
  </svg>
);
const IcoPlay = () => (
  <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor">
    <polygon points="4,2 13,8 4,14" />
  </svg>
);
const IcoRefresh = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="1 4 1 10 7 10" />
    <path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
  </svg>
);
const IcoLock = () => (
  <svg width="12" height="12" viewBox="0 0 16 16" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="7" width="10" height="7" rx="1.5" />
    <path d="M5 7V5a3 3 0 016 0v2" />
  </svg>
);
const IcoClock = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
  </svg>
);

// ─────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="ed-center">
      <div className="ed-spinner" />
      <p className="ed-hint">Loading your dashboard…</p>
    </div>
  );
}

function ErrorScreen({ message, onRetry }) {
  return (
    <div className="ed-center">
      <div className="ed-error-card">
        <span className="ed-error-icon">⚠️</span>
        <p>{message}</p>
        <button className="ed-btn ed-btn--start" onClick={onRetry}>Try Again</button>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const icons = {
    completed: <IcoCheck />,
    pending:   <IcoClock />,
    reexam:    <IcoRefresh />,
    active:    <IcoPlay />,
    locked:    <IcoLock />,
  };
  const meta = STATUS_META[status] ?? STATUS_META.locked;
  return (
    <span className={`ed-badge-status ed-badge-${meta.colorKey}`}>
      {icons[status]} {meta.label}
    </span>
  );
}

function ActionButton({ status, onStart, onReExam }) {
  if (status === "completed") return (
    <button className="ed-btn ed-btn--done" disabled>
      <IcoCheck /> Completed
    </button>
  );
  if (status === "pending") return (
    <button className="ed-btn ed-btn--wait" disabled>
      <IcoClock /> Waiting for Review
    </button>
  );
  if (status === "reexam") return (
    <button className="ed-btn ed-btn--reexam" onClick={onReExam}>
      <IcoRefresh /> Re-Exam
    </button>
  );
  if (status === "active") return (
    <button className="ed-btn ed-btn--start" onClick={onStart}>
      <IcoPlay /> Start Exam
    </button>
  );
  return (
    <button className="ed-btn ed-btn--locked" disabled>
      <IcoLock /> Locked
    </button>
  );
}

function LevelCard({ lvl, index, status, qCount, onStart, onReExam }) {
  const isLocked = status === "locked";
  return (
    <div className={`ed-level-card ed-level-card--${status} ${isLocked ? "ed-level-card--dim" : ""}`}>

      <div className={`ed-step ed-step--${status}`}>
        {status === "completed" ? <IcoCheck /> : <span>{index + 1}</span>}
      </div>

      <div className="ed-level-body">
        <div className="ed-level-name">
          {lvl.LevelName}
          {status === "active"  && <span className="ed-pill ed-pill--current">Current</span>}
          {status === "reexam"  && <span className="ed-pill ed-pill--reexam">Re-Exam</span>}
          {status === "pending" && <span className="ed-pill ed-pill--pending">Under Review</span>}
        </div>
        <div className="ed-level-meta">
          {qCount !== null
            ? <span>{qCount} question{qCount !== 1 ? "s" : ""}</span>
            : <span>{lvl.RoleName ?? ""}</span>
          }
          <span className="ed-dot">·</span>
          <StatusBadge status={status} />
        </div>
      </div>

      <div className="ed-level-action">
        <ActionButton status={status} onStart={onStart} onReExam={onReExam} />
      </div>

    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────
export default function EmployeeDashboard() {
  const navigate = useNavigate();

  const [employee, setEmployee] = useState(null);
  const [levels,   setLevels]   = useState([]);
  const [testRows, setTestRows] = useState([]);
  const [qCounts,  setQCounts]  = useState({});
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  // ── Auth guard ───────────────────────────────────────────────
  useEffect(() => {
    const raw = localStorage.getItem("employee");
    if (!raw) { navigate("/"); return; }
    setEmployee(JSON.parse(raw));
  }, [navigate]);

  // ── Fetch all dashboard data in parallel ─────────────────────
  const fetchAll = useCallback(async (emp) => {
    setLoading(true);
    setError(null);
    try {
      const [lvlRes, reviewRes, qRes] = await Promise.all([
        fetch(`${API_BASE}/SelectLevelMaster`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }),
        fetch(`${API_BASE}/SelectTestReview`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ EmployeeMasterRefid: emp.id }),
        }),
        fetch(`${API_BASE}/SelectQuestionMaster`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ RoleMasterRefid: emp.RoleMasterRefid }),
        }),
      ]);

      const [lvlData, reviewData, qData] = await Promise.all([
        lvlRes.json(), reviewRes.json(), qRes.json(),
      ]);

      if (!lvlData.IsSuccess || !Array.isArray(lvlData.Data3)) {
        throw new Error("Could not load levels. Please try again.");
      }

      const roleLevels = lvlData.Data3
        .filter(l => l.RoleMasterRefid === emp.RoleMasterRefid)
        .sort((a, b) => a.Id - b.Id);
      setLevels(roleLevels);

      const rows = reviewData.IsSuccess && Array.isArray(reviewData.Data3)
        ? reviewData.Data3 : [];
      setTestRows(rows);

      if (qData.IsSuccess && Array.isArray(qData.Data3)) {
        const counts = {};
        for (const q of qData.Data3) {
          counts[q.LevelMasterRefid] = (counts[q.LevelMasterRefid] ?? 0) + 1;
        }
        setQCounts(counts);
      }
    } catch (err) {
      console.error("Dashboard error:", err);
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (employee) fetchAll(employee);
  }, [employee, fetchAll]);

  // ── Navigation ───────────────────────────────────────────────
  const goToTest = (lvl) => {
    localStorage.setItem("employee", JSON.stringify({
      ...employee,
      LevelMasterRefid: lvl.Id,
      levelName:        lvl.LevelName,
      testStatus:       0,
    }));
    navigate("/TestMaster");
  };

  const handleLogout = () => {
    localStorage.removeItem("employee");
    navigate("/");
  };

  // ── Derived ──────────────────────────────────────────────────
  const statusByLevel = computeLevelStatuses(testRows);
  const resolvedLevels = levels.map((lvl, idx) => ({
    ...lvl,
    status: resolveLevelStatus(lvl, employee ?? {}, statusByLevel, idx),
  }));

  const completedCount = resolvedLevels.filter(l => l.status === "completed").length;
  const totalCount     = resolvedLevels.length;
  const progressPct    = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const allLevelsDone  = totalCount > 0 && completedCount === totalCount;

  // ── Render ───────────────────────────────────────────────────
  return (
    <div className="ed-shell">

      {/* ══ STICKY TOP HEADER ══ */}
      <DashboardHeader employee={employee} onLogout={handleLogout} />

      {/* ══ PAGE BODY ══ */}
      <main className="ed-body">
        <div className="ed-wrap">

          {loading && <Spinner />}
          {!loading && error && (
            <ErrorScreen message={error} onRetry={() => employee && fetchAll(employee)} />
          )}

          {!loading && !error && (
            <>
              {/* ── Welcome strip ── */}
              <div className="ed-welcome">
                <div>
                  <h2 className="ed-welcome-title">
                    Welcome back, {(employee?.name ?? "Employee").split(" ")[0]} 👋
                  </h2>
                  <p className="ed-welcome-sub">
                    {employee?.levelName
                      ? `You are currently on ${employee.levelName}.`
                      : "Complete your training levels to progress."}
                  </p>
                </div>
                <button className="ed-refresh-btn"
                  onClick={() => fetchAll(employee)}
                  title="Refresh dashboard">
                  <IcoRefresh /> Refresh
                </button>
              </div>

              {/* ── Progress bar ── */}
              <div className="ed-prog-row">
                <span>Overall progress</span>
                <span className="ed-prog-pct">{progressPct}%</span>
              </div>
              <div className="ed-prog-track">
                <div className="ed-prog-fill" style={{ width: `${progressPct}%` }} />
              </div>

              {/* ── All Levels Completed Banner ── */}
              {allLevelsDone && (
                <div style={{
                  margin: "12px 0 8px",
                  padding: "18px 24px",
                  borderRadius: 14,
                  background: "linear-gradient(135deg, #dcfce7, #bbf7d0)",
                  border: "1.5px solid #86efac",
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                }}>
                  <span style={{ fontSize: "2rem" }}>🎉</span>
                  <div>
                    <div style={{ fontSize: "1.05rem", fontWeight: 800, color: "#14532d" }}>
                      All Levels Completed!
                    </div>
                    <div style={{ fontSize: "0.85rem", color: "#166534", marginTop: 2 }}>
                      Congratulations — you have successfully completed all training levels.
                    </div>
                  </div>
                </div>
              )}

              {/* ── Stats strip ── */}
              <div className="ed-stats">
                <div className="ed-stat-card">
                  <span className="ed-stat-num">{totalCount}</span>
                  <span className="ed-stat-lbl">Total Levels</span>
                </div>
                <div className="ed-stat-card">
                  <span className="ed-stat-num ed-stat-green">{completedCount}</span>
                  <span className="ed-stat-lbl">Completed</span>
                </div>
                <div className="ed-stat-card">
                  <span className="ed-stat-num ed-stat-blue">{totalCount - completedCount}</span>
                  <span className="ed-stat-lbl">Remaining</span>
                </div>
                <div className="ed-stat-card">
                  <span className="ed-stat-num ed-stat-purple">{progressPct}%</span>
                  <span className="ed-stat-lbl">Progress</span>
                </div>
              </div>

              {/* ── Section heading ── */}
              <div className="ed-sec-head">
                <span className="ed-sec-title">Training Levels</span>
                <span className="ed-sec-count">{totalCount} total</span>
              </div>

              {/* ── Legend ── */}
              <div className="ed-legend">
                {[
                  { key:"completed", icon:<IcoCheck />,   label:"Completed"      },
                  { key:"pending",   icon:<IcoClock />,   label:"Pending Review" },
                  { key:"reexam",    icon:<IcoRefresh />, label:"Re-Exam"        },
                  { key:"active",    icon:<IcoPlay />,    label:"Unlocked"       },
                  { key:"locked",    icon:<IcoLock />,    label:"Locked"         },
                ].map(({ key, icon, label }) => (
                  <span key={key} className={`ed-leg-item ed-leg-${key}`}>
                    {icon} {label}
                  </span>
                ))}
              </div>

              {/* ── Levels ── */}
              {resolvedLevels.length === 0 ? (
                <div className="ed-empty">
                  No levels found for your role. Contact your admin.
                </div>
              ) : (
                <div className="ed-levels">
                  {resolvedLevels.map((lvl, idx) => (
                    <LevelCard
                      key={lvl.Id}
                      lvl={lvl}
                      index={idx}
                      status={lvl.status}
                      qCount={qCounts[lvl.Id] ?? null}
                      onStart={() => goToTest(lvl)}
                      onReExam={() => goToTest(lvl)}
                    />
                  ))}
                </div>
              )}

              <p className="ed-footer-hint">
                Results update after admin review.{" "}
                <button className="ed-link-btn" onClick={() => fetchAll(employee)}>
                  Refresh now
                </button>
              </p>
            </>
          )}

        </div>
      </main>
    </div>
  );
}
