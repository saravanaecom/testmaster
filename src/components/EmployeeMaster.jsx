import React, { useState, useEffect } from "react";
import "../index.css";
import { useNavigate } from "react-router-dom";
import Image from "../assets/image.png";
import Logo from "../assets/logo.png";
import { FaEye, FaEyeSlash } from "react-icons/fa";


const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [mobileNumber, setMobileNumber] = useState("");
  const [password, setPassword]         = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    localStorage.removeItem("employee");
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const form  = e.target.form;
      const index = [...form.elements].indexOf(e.target);
      if (index === form.elements.length - 1) {
        handleLogin();
      } else if (index > -1) {
        form.elements[index + 1].focus();
      }
    }
  };

  const handleLogin = async () => {
    if (!mobileNumber || !password) {
      alert("Enter Mobile Number & Password");
      return;
    }

    try {
      //const res = await fetch("http://localhost:44300/api/SupportApp/Login", {
        const res = await fetch("https://testapi.kassapos.co.in/api/SupportApp/Login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          MobileNo: mobileNumber,
          Password: password,
        }),
      });

      const data = await res.json();

      if (data.IsSuccess) {
        if (data.UserType === "Employee") {
          const emp = data.Data3[0];

          // FIX: Save RoleMasterRefid (int FK) + RoleName (display) instead of old RoleType text.
          // TestMaster.jsx uses RoleMasterRefid to call SelectQuestionMaster.
          localStorage.setItem("employee", JSON.stringify({
            id:               emp.Id,
            name:             emp.EmployeeName,
            RoleMasterRefid:  emp.RoleMasterRefid  ?? null,
            roleName:         emp.RoleName         ?? "",
            dept:             emp.RoleName         ?? "",
            // ── Level fields (both casings) ──────────────────────────────
            // levelName / LevelMasterRefid are used by TestMaster for API calls
            // and for the "current level" display in Topbar.
            // testLevel / levelMasterRefid are the lowercase-keyed fallbacks
            // used in the allApproved re-fetch merge and loadFreshQuestions.
            levelName:        emp.LevelName        ?? "",
            testLevel:        emp.TestLevel        ?? emp.LevelName ?? "",
            LevelMasterRefid: emp.LevelMasterRefid ?? null,
            levelMasterRefid: emp.LevelMasterRefid ?? null,
            testStatus:       emp.TestStatus       ?? 0,
            userType:         data.UserType,
          }));
          navigate("/dashboard");
          //navigate("/TestMaster");

        } else if (data.UserType === "Admin") {
          const admin = data.Data3[0];
          localStorage.setItem("employee", JSON.stringify({
            id:       admin.Id,
            name:     admin.MobileNo || "Admin",
            userType: "Admin",
          }));
          navigate("/question");

        } else {
          alert("Unknown user type. Contact admin.");
        }

      } else {
        alert(data.Message || "Invalid Mobile or Password");
      }

    } catch (err) {
      console.error("Login ERROR:", err);
      alert("Server Error");
    }
  };

  return (
    <div className="login-main">

      {/* LEFT: FORM */}
      <div className="login-right">
        <div className="login-right-container">

          <div className="login-logo">
            <img src={Logo} alt="Kassapos Logo" />
          </div>

          <div className="login-center">
            <h2>Welcome Back</h2>
            <p>Sign in to your account</p>

            <form>
              <div className="input-group">
                <span className="input-icon">✉</span>
                <input
                  type="text"
                  placeholder="Mobile Number"
                  onChange={(e) => setMobileNumber(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
              </div>

              <div className="pass-input-div input-group">
                <span className="input-icon">🔑</span>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  autoComplete="current-password"
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
                {showPassword
                  ? <FaEyeSlash onClick={() => setShowPassword(!showPassword)} />
                  : <FaEye onClick={() => setShowPassword(!showPassword)} />
                }
              </div>

              <div className="login-center-buttons">
                <button type="button" onClick={handleLogin} onKeyDown={handleKeyDown}>
                  Log In
                </button>
                <button
                  type="button"
                  className="signup-outline-btn"
                  onClick={() => navigate("/signup")}
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>

        </div>
      </div>

      {/* RIGHT: IMAGE */}
      <div className="login-left">
        <div className="login-left-overlay">
          <div className="login-left-brand">
            <div className="left-logo-ring">
              <span className="left-logo-letter">K</span>
            </div>
            <h1 className="left-brand-title">Kassapos</h1>
            <p className="left-brand-sub">Billing Solutions Platform</p>
          </div>

          <img src={Image} alt="Kassapos Illustration" className="login-hero-img" />

          <div className="left-floating-card left-card-1">
            <span className="lfc-icon">📦</span>
            <div>
              <div className="lfc-title">10,000+</div>
              <div className="lfc-sub">Invoices Generated</div>
            </div>
          </div>

          <div className="left-floating-card left-card-2">
            <span className="lfc-icon">🔒</span>
            <div>
              <div className="lfc-title">256-bit</div>
              <div className="lfc-sub">Encrypted &amp; Secure</div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default Login;
