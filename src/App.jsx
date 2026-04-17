import { BrowserRouter, Routes, Route } from "react-router-dom";
import LevelMaster    from "./components/LevelMaster";
import QuestionMaster from "./components/QuestionMaster";
import EmployeeMaster from "./components/EmployeeMaster";
import Signup         from "./components/Signup";
import TestMaster     from "./components/TestMaster";       // ✅ NEW
import ProtectedRoute from "./components/ProtectedRoute";
import CorrectionsPage from"./components/CorrectionsPage"
function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ── Public ──────────────────────── */}
        <Route path="/"       element={<EmployeeMaster />} />
        <Route path="/signup" element={<Signup />} />

        {/* ── Admin only ──────────────────── */}
        <Route path="/question" element={
          <ProtectedRoute allowedUserType="Admin">
            <QuestionMaster />
          </ProtectedRoute>
        } />

        <Route path="/LevelMaster" element={
          <ProtectedRoute allowedUserType="Admin">
            <LevelMaster />
          </ProtectedRoute>
        } />

        {/* ✅ Review page — Admin picks an employee to review */}
        <Route path="/corrections" element={
          <ProtectedRoute allowedUserType="Admin">
           <CorrectionsPage />
          </ProtectedRoute>
        } />

        {/* ── Employee only ───────────────── */}
        <Route path="/testmaster" element={
          <ProtectedRoute allowedUserType="Employee">
            <TestMaster />
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
