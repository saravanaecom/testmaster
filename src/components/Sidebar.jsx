// src/components/Sidebar.jsx
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "../Sidebar.css";

export default function Sidebar() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (path) => location.pathname === path;

  const handleLogout = () => {
    localStorage.removeItem("employee");
    navigate("/");
  };

  return (
    <div className={`sb-root ${collapsed ? "sb-root--collapsed" : ""}`}>

      {/* ── Brand ── */}
      <div className="sb-brand">
        <div className="sb-brand-logo">K</div>
        {!collapsed && (
          <div className="sb-brand-text">
            <div className="sb-brand-name">KASSAPOS</div>
            <div className="sb-brand-sub">Software Solutions</div>
          </div>
        )}
        <button className="sb-collapse-btn" onClick={() => setCollapsed(p => !p)}>
          {collapsed ? "›" : "‹"}
        </button>
      </div>

      {/* ── Nav ── */}
      <nav className="sb-nav">
        <div className="sb-section-label">{!collapsed && "ADMIN"}</div>

        <button
          className={`sb-item ${isActive("/question") ? "sb-item--active" : ""}`}
          onClick={() => navigate("/question")}
          title="Question Master"
        >
          <span className="sb-item-icon">❓</span>
          {!collapsed && <span className="sb-item-label">Question Master</span>}
        </button>

        <button
          className={`sb-item ${isActive("/LevelMaster") ? "sb-item--active" : ""}`}
          onClick={() => navigate("/LevelMaster")}
          title="Level Master"
        >
          <span className="sb-item-icon">📄</span>
          {!collapsed && <span className="sb-item-label">Level Master</span>}
        </button>

        {/* ✅ NEW — Corrections Page link */}
        <button
          className={`sb-item ${isActive("/corrections") ? "sb-item--active" : ""}`}
          onClick={() => navigate("/corrections")}
          title="Corrections"
        >
          <span className="sb-item-icon">🔍</span>
          {!collapsed && <span className="sb-item-label">Corrections</span>}
        </button>

      </nav>

      {/* ── Footer / Logout ── */}
      <div className="sb-footer">
        <button className="sb-logout" onClick={handleLogout} title="Logout">
          <span className="sb-item-icon">🚪</span>
          {!collapsed && <span className="sb-item-label">Logout</span>}
        </button>
      </div>

    </div>
  );
}
