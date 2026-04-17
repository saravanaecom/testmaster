import React, { useState, useEffect } from "react";
import "../index.css";
import { useNavigate } from "react-router-dom";
import Image from "../assets/image.png";
import Logo from "../assets/logo.png";
import { FaEye, FaEyeSlash } from "react-icons/fa";

const Signup = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [roles, setRoles] = useState([]);
  const [form, setForm] = useState({
    employeeName: "",
    mobileNumber: "",
    password: "",
    roleId: "",
    testLevel: "LEVEL1",
  });

  useEffect(() => {
    fetch("http://localhost:44300/api/SupportApp/GetRoles")
      .then((res) => res.json())
      .then((data) => {
        console.log("GetRoles response:", data); // keep for debugging

        // ✅ FIXED: Backend now uses Data3; fallback to Data just in case
        const roleList = data.Data3 || data.Data || [];
        if (Array.isArray(roleList) && roleList.length > 0) {
          setRoles(roleList);
        } else {
          console.warn("No roles returned from API:", data);
        }
      })
      .catch((err) => console.error("Error fetching roles:", err));
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const formEl = e.target.form;
      const index = [...formEl.elements].indexOf(e.target);
      if (index === formEl.elements.length - 1) {
        handleSignup();
      } else if (index > -1) {
        formEl.elements[index + 1].focus();
      }
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSignup = async () => {
    const { employeeName, mobileNumber, password, roleId, testLevel } = form;

    if (!employeeName || !mobileNumber || !password || !roleId) {
      alert("Please fill all fields");
      return;
    }

    try {
      const res = await fetch("http://localhost:44300/api/SupportApp/Signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          EmployeeName: employeeName,
          MobileNo: mobileNumber,
          Password: password,
          RoleMasterRefid: parseInt(roleId),
          TestLevel: testLevel,
        }),
      });

      const data = await res.json();

      if (data.IsSuccess) {
        alert("Account created successfully!");
        navigate("/");
      } else {
        alert(data.Message || "Signup failed");
      }
    } catch (err) {
      console.error("SIGNUP ERROR:", err);
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
            <h2>Create Account</h2>
            <p>Register your employee profile</p>

            <form>
              {/* Employee Name */}
              <div className="input-group">
                <span className="input-icon">👤</span>
                <input
                  type="text"
                  name="employeeName"
                  placeholder="Employee Name"
                  value={form.employeeName}
                  onChange={handleChange}
                  onKeyDown={handleKeyDown}
                />
              </div>

              {/* Mobile Number */}
              <div className="input-group">
                <span className="input-icon">📱</span>
                <input
                  type="text"
                  name="mobileNumber"
                  placeholder="Mobile Number"
                  value={form.mobileNumber}
                  onChange={handleChange}
                  onKeyDown={handleKeyDown}
                />
              </div>

              {/* Password */}
              <div className="pass-input-div input-group">
                <span className="input-icon">🔑</span>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Password"
                  autoComplete="new-password"
                  value={form.password}
                  onChange={handleChange}
                  onKeyDown={handleKeyDown}
                />
                {showPassword
                  ? <FaEyeSlash onClick={() => setShowPassword(!showPassword)} />
                  : <FaEye onClick={() => setShowPassword(!showPassword)} />
                }
              </div>

              {/* Role Dropdown */}
              <div className="input-group" style={{ marginBottom: "16px" }}>
                <span className="input-icon">🏷️</span>
                <select
                  name="roleId"
                  value={form.roleId}
                  onChange={handleChange}
                  className="role-select"
                >
                  <option value="">
                    {roles.length === 0 ? "Loading roles..." : "Select Role"}
                  </option>
                  {roles.map((r) => (
                    <option key={r.Id} value={r.Id}>
                      {r.RoleName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="login-center-buttons">
                <button type="button" onClick={handleSignup}>
                  Register
                </button>
                <button
                  type="button"
                  className="signup-outline-btn"
                  onClick={() => navigate("/")}
                >
                  Back to Login
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
              <div className="lfc-sub">Encrypted & Secure</div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default Signup;
