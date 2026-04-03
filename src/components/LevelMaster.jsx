import { useState, useEffect } from "react";
import "../LevelMaster.css";

const BASE_URL = "https://testapi.kassapos.co.in/";

async function api(endpoint, body = {}) {
  const url = `${BASE_URL}/api${endpoint}`;
  console.log("Calling:", url);
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
  return res.json();
}

const ROLE_META = {
  Implementation: { cls: "role-impl",  icon: "⚙️" },
  Support:        { cls: "role-supp",  icon: "🛡️" },
  Sales:          { cls: "role-sales", icon: "📈" },
};

function RoleBadge({ role }) {
  const meta = ROLE_META[role] || { cls: "role-other", icon: "🔷" };
  return (
    <span className={`lm-role-badge ${meta.cls}`}>
      {meta.icon} {role || "—"}
    </span>
  );
}

const handleKeyDown = (e) => {
  if (e.key === "Enter") {
    e.preventDefault();

    const form = e.target.form;
    const index = [...form.elements].indexOf(e.target);

    // 👉 last fieldனா → add/update call
    if (index === form.elements.length - 1) {
      handleAdd();
    } else if (index > -1) {
      form.elements[index + 1].focus();
    }
  }
};

export default function LevelMaster() {
  const [levelName, setLevelName] = useState("");
  const [roleType, setRoleType]   = useState("");
  const [data, setData]           = useState([]);
  const [editId, setEditId]       = useState(null);
  const [toast, setToast]         = useState(null);
  const [filter, setFilter]       = useState("");
  const [loading, setLoading]     = useState(false);

  const showToast = (msg, icon = "✅") => {
    setToast({ msg, icon });
    setTimeout(() => setToast(null), 3000);
  };

  // ─── LOAD ──────────────────────────────────────────────────
  const loadLevels = async () => {
    setLoading(true);
    try {
      const res = await api("/SupportApp/SelectLevelMaster");
      if (res.IsSuccess && Array.isArray(res.Data3)) {
        const mapped = res.Data3.map(r => ({
          id:        r.Id        ?? r.id,     //fallback logic
          levelName: r.LevelName ?? r.levelName,
          roleType:  r.RoleType  ?? r.roleType,
          active:    r.Active    ?? r.active,
        }));
        setData(mapped);
      } else {
        showToast(res.message || "Failed to load records", "❌");
      }
    } catch {
      showToast("Network error — could not load records", "❌");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadLevels(); }, []);

  // ─── ADD / UPDATE ──────────────────────────────────────────
  const handleAdd = async () => {
    if (!levelName || !roleType) {
      showToast("Please fill all fields", "⚠️");
      return;
    }
    try {
      if (editId !== null) {
        const res = await api("/SupportApp/UpdateLevelMaster", {
          Id: editId, LevelName: levelName, RoleType: roleType,
        });
        if (res.IsSuccess) {
          setData(prev =>
            prev.map(item =>
              item.id === editId ? { ...item, levelName, roleType } : item
            )
          );
          showToast("Record updated successfully", "✏️");
        } else {
          showToast(res.message || "Update failed", "❌");
        }
      } else {
        const res = await api("/SupportApp/InsertLevelMaster", {
          LevelName: levelName, RoleType: roleType,
        });
        if (res.IsSuccess) {
          await loadLevels();
          showToast("Record saved successfully", "✅");
        } else {
          showToast(res.message || "Insert failed", "❌");
        }
      }
    } catch {
      showToast("Network error", "❌");
    }
    setLevelName(""); setRoleType(""); setEditId(null);
  };

  // ─── DELETE ────────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this record?")) return;
    try {
      const res = await api("/SupportApp/DeleteLevelMaster", { Id: id });
      if (res.IsSuccess) {
        setData(prev => prev.filter(item => item.id !== id));
        showToast("Record deleted", "🗑️");
      } else {
        showToast(res.message || "Delete failed", "❌");
      }
    } catch {
      showToast("Network error", "❌");
    }
  };

  // ─── EDIT ──────────────────────────────────────────────────
  const handleEdit = (item) => {
    setLevelName(item.levelName);
    setRoleType(item.roleType);
    setEditId(item.id);
  };

  const handleCancel = () => {
    setLevelName(""); setRoleType(""); setEditId(null);
  };

  // ─── STATS & FILTER ────────────────────────────────────────
  const roleCounts = data.reduce((acc, item) => {
    acc[item.roleType] = (acc[item.roleType] || 0) + 1;
    return acc;
  }, {});

  const filteredData = filter
    ? data.filter(item => item.roleType === filter)
    : data;

  // ─── RENDER ────────────────────────────────────────────────
  return (
    <div className="lm-root">
      <div className="lm-inner">

        {/* Header */}
        <div className="lm-header">
          <div className="lm-header-icon">🏷️</div>
          <div>
            <div className="lm-title">Level Master</div>
            <div className="lm-subtitle">Manage role levels and assignments</div>
          </div>
        </div>

        {/* Stats */}
        <div className="lm-stats">
          {[
            { val: data.length,                       key: "Total Records"  },
            { val: roleCounts["Implementation"] || 0, key: "Implementation" },
            { val: roleCounts["Support"]        || 0, key: "Support"        },
            { val: roleCounts["Sales"]          || 0, key: "Sales"          },
          ].map(s => (
            <div className="lm-stat" key={s.key}>
              <div className="lm-stat-val">{s.val}</div>
              <div className="lm-stat-key">{s.key}</div>
            </div>
          ))}
        </div>

        {/* Form Card */}
        <div className="lm-card">
          <div className="lm-card-label">
            {editId !== null ? "Edit Record" : "Add New Record"}
          </div>

          {editId !== null && (
            <div className="lm-edit-indicator">
              ✏️ Editing record <strong>#{editId}</strong>
            </div>
          )}

          <div className="lm-form-grid">
            <div className="lm-field">
              <label>Level Name</label>
              <input
                className="lm-input"
                type="text"
                placeholder="e.g. Level 1"
                value={levelName}
                onChange={e => setLevelName(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>

            <div className="lm-field">
              <label>Role Type</label>
              <div className="lm-select-wrap">
                <select
                  className="lm-select"
                  value={roleType}
                  onChange={e => setRoleType(e.target.value)}onKeyDown={handleKeyDown}
                >
                  <option value="">Select Role</option>
                  <option value="Implementation">⚙️ Implementation</option>
                  <option value="Support">🛡️ Support</option>
                  <option value="Sales">📈 Sales</option>
                </select>
              </div>
            </div>

            <div className="lm-btn-actions">
              <button
                className={`lm-btn-primary ${editId !== null ? "lm-btn-update" : ""}`}
                onClick={handleAdd}
              >
                {editId !== null ? "✏️ Update" : "+ Add"}
              </button>
              {editId !== null && (
                <button className="lm-btn-cancel" onClick={handleCancel}>
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>
 
        {/* Table Card */}
        <div className="lm-card">

          {/* Filter bar */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div className="lm-card-label" style={{ marginBottom: 0 }}>
              Records — {filteredData.length}{filter ? ` ${filter}` : ""} entr{filteredData.length === 1 ? "y" : "ies"}
            </div>
            <div className="lm-select-wrap" style={{ minWidth: 180 }}>
              <select
                className="lm-select"
                value={filter}
                onChange={e => setFilter(e.target.value)}
              >
                <option value="">All Roles</option>
                <option value="Implementation">⚙️ Implementation</option>
                <option value="Support">🛡️ Support</option>
                <option value="Sales">📈 Sales</option>
              </select>
            </div>
          </div>

          <div className="lm-table-wrap">
            {loading ? (
              <div className="lm-empty">
                <div className="lm-empty-icon">⏳</div>
                <p>Loading records...</p>
              </div>
            ) : (
              <table className="lm-table">
                <thead>
                  <tr>
                    <th>Level Name</th>
                    <th>Role Type</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.length > 0 ? (
                    filteredData.map(item => (
                      <tr key={item.id}>
                        <td style={{ fontWeight: 500, color: "#0f172a" }}>{item.levelName}</td>
                        <td><RoleBadge role={item.roleType} /></td>
                        <td>
                          <div style={{ display: "flex", gap: 8 }}>
                            <button className="lm-action-edit" onClick={() => handleEdit(item)}>Edit</button>
                            <button className="lm-action-del"  onClick={() => handleDelete(item.id)}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3}>
                        <div className="lm-empty">
                          <div className="lm-empty-icon">📋</div>
                          <p>{filter ? `No ${filter} records found.` : "No records yet. Add your first level above."}</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {toast && (
        <div className="lm-toast">
          <span className="lm-toast-icon">{toast.icon}</span>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
