import "../DashboardHeader.css";

// ─────────────────────────────────────────────────────
// SVG ICONS
// ─────────────────────────────────────────────────────
function IcoLogout() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

function IcoChevron() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4,6 8,10 12,6" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────
// UTILITY
// ─────────────────────────────────────────────────────
function getInitials(name = "") {
  return name.trim().split(/\s+/).slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? "").join("");
}

function avatarBg(name = "") {
  const palette = ["#6366f1","#0ea5e9","#10b981","#f59e0b","#8b5cf6","#ec4899"];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return palette[Math.abs(h) % palette.length];
}

// ─────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────

/**
 * DashboardHeader
 *
 * Props:
 *   employee  – { name: string, roleName: string }
 *   onLogout  – () => void
 */
export default function DashboardHeader({ employee, onLogout }) {
  const name = employee?.name     ?? "Employee";
  const role = employee?.roleName ?? employee?.dept ?? "Staff";
  const bg   = avatarBg(name);

  return (
    <header className="dh-root">
      <div className="dh-inner">

        {/* ── LEFT: Brand ── */}
        <div className="dh-brand">
          <div className="dh-logo-box">
            <span className="dh-logo-letter">K</span>
          </div>
          <div className="dh-brand-text">
            <span className="dh-brand-name">KASSAPOS</span>
            <span className="dh-brand-sub">Software Solutions</span>
          </div>
        </div>

        {/* ── RIGHT: Employee info ── */}
        <div className="dh-user">
          {/* Avatar */}
          <div className="dh-avatar" style={{ background: bg }}>
            {getInitials(name)}
          </div>

          {/* Name + role */}
          <div className="dh-user-info">
            <span className="dh-user-name">{name}</span>
            <span className="dh-user-role">{role}</span>
          </div>

          {/* Divider */}
          <div className="dh-divider" />

          {/* Logout button */}
          <button className="dh-logout" onClick={onLogout} title="Logout">
            <IcoLogout />
            <span className="dh-logout-label">Logout</span>
          </button>
        </div>

      </div>
    </header>
  );
}
