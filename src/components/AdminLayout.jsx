// src/components/AdminLayout.jsx
import { Link } from "react-router-dom";
import Sidebar from "./Sidebar";

export default function AdminLayout({ children, title, recordCount, editId }) {
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f0f4ff" }}>

      <Sidebar />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* ── Top Bar ── */}
        <div className="qm-topbar">
          <span className="qm-brand">KASSAPOS SOFTWARE SOLUTIONS</span>
        </div>

        {/* ── Title Strip ── */}
        <div className="qm-title-strip">
          <span>{title}</span>
          {editId !== null && editId !== undefined && (
            <span className="qm-edit-badge">✏️ Editing #{editId}</span>
          )}
          {recordCount !== undefined && (
            <span className="qm-record-count">
              {recordCount} record{recordCount !== 1 ? "s" : ""}
              <Link to="/corrections">📋 Corrections</Link>
            </span>
          )}
        </div>

        {/* ── Page Content ── */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {children}
        </div>

      </div>
    </div>
  );
}
