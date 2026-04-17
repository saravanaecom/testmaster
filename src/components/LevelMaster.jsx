import { useState, useEffect } from "react";
import "../LevelMaster.css";
import "../QuestionMaster.css";
import AdminLayout from "../components/AdminLayout";

//const BASE_URL = "http://localhost:44300/";

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

// FIX: RoleBadge now receives roleName (string) from the JOIN, same display logic
function RoleBadge({ role }) {
  const ROLE_META = {
    Implementation: { cls: "role-impl",  icon: "⚙️" },
    Support:        { cls: "role-supp",  icon: "🛡️" },
    Sales:          { cls: "role-sales", icon: "📈" },
  };
  const meta = ROLE_META[role] || { cls: "role-other", icon: "🔷" };
  return (
    <span className={`lm-role-badge ${meta.cls}`}>
      {meta.icon} {role || "—"}
    </span>
  );
}

export default function LevelMaster() {
  const [levelName, setLevelName]           = useState("");
  // FIX: roleMasterRefid (int) replaces roleType (string)
  const [roleMasterRefid, setRoleMasterRefid] = useState("");
  const [roles, setRoles]                   = useState([]);   // from GetRoles API
  const [data, setData]                     = useState([]);
  const [editId, setEditId]                 = useState(null);
  const [toast, setToast]                   = useState(null);
  const [filter, setFilter]                 = useState("");   // filter by RoleMasterRefid
  const [loading, setLoading]               = useState(false);

  const showToast = (msg, icon = "✅") => {
    setToast({ msg, icon });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Load Roles from RoleMaster ──────────────────────────
  const loadRoles = async () => {
    try {
      const res  = await fetch(`${BASE_URL}api/SupportApp/GetRoles`);
      const data = await res.json();
      if (data.IsSuccess && Array.isArray(data.Data3)) {
        setRoles(data.Data3.map(r => ({ id: r.Id, roleName: r.RoleName })));
      }
    } catch {
      showToast("Could not load roles", "❌");
    }
  };

  // ── Load Levels ─────────────────────────────────────────
  const loadLevels = async () => {
    setLoading(true);
    try {
      const res = await api("/SupportApp/SelectLevelMaster");
      if (res.IsSuccess && Array.isArray(res.Data3)) {
        setData(
          res.Data3.map((r) => ({
            id:             r.Id             ?? r.id,
            levelName:      r.LevelName      ?? r.levelName,
            // FIX: store RoleMasterRefid + RoleName (returned by JOIN in service)
            roleMasterRefid: r.RoleMasterRefid ?? r.roleMasterRefid,
            roleName:        r.RoleName        ?? r.roleName ?? "",
            active:          r.Active          ?? r.active,
          }))
        );
      } else {
        showToast(res.message || "Failed to load records", "❌");
      }
    } catch {
      showToast("Network error — could not load records", "❌");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoles();
    loadLevels();
  }, []);

  const handleAdd = async () => {
    // FIX: validate roleMasterRefid (int) instead of roleType (string)
    if (!levelName || !roleMasterRefid) {
      showToast("Please fill all fields", "⚠️");
      return;
    }
    try {
      if (editId !== null) {
        const res = await api("/SupportApp/UpdateLevelMaster", {
          Id:             editId,
          LevelName:      levelName,
          // FIX: send RoleMasterRefid (int) instead of RoleType (string)
          RoleMasterRefid: Number(roleMasterRefid),
        });
        if (res.IsSuccess) {
          // FIX: update local state with roleMasterRefid + roleName
          const roleName = roles.find(r => String(r.id) === String(roleMasterRefid))?.roleName ?? "";
          setData((prev) =>
            prev.map((item) =>
              item.id === editId
                ? { ...item, levelName, roleMasterRefid: Number(roleMasterRefid), roleName }
                : item
            )
          );
          showToast("Record updated successfully", "✏️");
        } else {
          showToast(res.message || "Update failed", "❌");
        }
      } else {
        const res = await api("/SupportApp/InsertLevelMaster", {
          LevelName:       levelName,
          // FIX: send RoleMasterRefid (int) instead of RoleType (string)
          RoleMasterRefid: Number(roleMasterRefid),
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
    setLevelName("");
    setRoleMasterRefid("");
    setEditId(null);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this record?")) return;
    try {
      const res = await api("/SupportApp/DeleteLevelMaster", { Id: id });
      if (res.IsSuccess) {
        setData((prev) => prev.filter((item) => item.id !== id));
        showToast("Record deleted", "🗑️");
      } else {
        showToast(res.message || "Delete failed", "❌");
      }
    } catch {
      showToast("Network error", "❌");
    }
  };

  const handleEdit = (item) => {
    setLevelName(item.levelName);
    // FIX: restore RoleMasterRefid (int as string) not RoleType
    setRoleMasterRefid(String(item.roleMasterRefid ?? ""));
    setEditId(item.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancel = () => {
    setLevelName("");
    setRoleMasterRefid("");
    setEditId(null);
  };

  // FIX: stats use roleName (from JOIN) for display grouping
  const roleCounts = data.reduce((acc, item) => {
    acc[item.roleName] = (acc[item.roleName] || 0) + 1;
    return acc;
  }, {});

  // FIX: filter by roleMasterRefid (int), not RoleType (string)
  const filteredData = filter
    ? data.filter((item) => String(item.roleMasterRefid) === String(filter))
    : data;

  return (
    <AdminLayout title="LEVEL DETAILS" recordCount={data.length} editId={editId}>

      <div className="lm-inner" style={{ padding: "24px 32px" }}>

        {/* ── Stats ── */}
        <div className="lm-stats">
          {[
            { val: data.length, key: "Total Records" },
            // FIX: stats keyed by roleName (from JOIN)
            ...roles.map(r => ({ val: roleCounts[r.roleName] || 0, key: r.roleName })),
          ].map((s) => (
            <div className="lm-stat" key={s.key}>
              <div className="lm-stat-val">{s.val}</div>
              <div className="lm-stat-key">{s.key}</div>
            </div>
          ))}
        </div>

        {/* ── Form Card ── */}
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
                onChange={(e) => setLevelName(e.target.value)}
              />
            </div>
            <div className="lm-field">
              <label>Role Type</label>
              <div className="lm-select-wrap">
                {/* FIX: populated from GetRoles API, value = RoleMasterRefid */}
                <select
                  className="lm-select"
                  value={roleMasterRefid}
                  onChange={(e) => setRoleMasterRefid(e.target.value)}
                >
                  <option value="">
                    {roles.length === 0 ? "Loading roles..." : "Select Role"}
                  </option>
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.roleName}
                    </option>
                  ))}
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

        {/* ── Table Card ── */}
        <div className="lm-card">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 12,
            }}
          >
            <div className="lm-card-label" style={{ marginBottom: 0 }}>
              Records —{" "}
              {filteredData.length}
              {filter
                ? ` ${roles.find(r => String(r.id) === String(filter))?.roleName ?? ""}`
                : ""}{" "}
              entr{filteredData.length === 1 ? "y" : "ies"}
            </div>
            <div className="lm-select-wrap" style={{ minWidth: 180 }}>
              {/* FIX: filter dropdown uses RoleMasterRefid as value, RoleName as label */}
              <select
                className="lm-select"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="">All Roles</option>
                {roles.map(r => (
                  <option key={r.id} value={r.id}>{r.roleName}</option>
                ))}
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
                    filteredData.map((item) => (
                      <tr key={item.id}>
                        <td style={{ fontWeight: 500, color: "#0f172a" }}>
                          {item.levelName}
                        </td>
                        <td>
                          {/* FIX: display roleName (from JOIN) not old roleType text */}
                          <RoleBadge role={item.roleName} />
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: 8 }}>
                            <button
                              className="lm-action-edit"
                              onClick={() => handleEdit(item)}
                            >
                              Edit
                            </button>
                            <button
                              className="lm-action-del"
                              onClick={() => handleDelete(item.id)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3}>
                        <div className="lm-empty">
                          <div className="lm-empty-icon">📋</div>
                          <p>
                            {filter
                              ? `No ${roles.find(r => String(r.id) === String(filter))?.roleName ?? ""} records found.`
                              : "No records yet. Add your first level above."}
                          </p>
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

      {/* ── Toast ── */}
      {toast && (
        <div className="lm-toast">
          <span className="lm-toast-icon">{toast.icon}</span>
          {toast.msg}
        </div>
      )}

    </AdminLayout>
  );
}
