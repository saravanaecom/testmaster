// import { BrowserRouter, Routes, Route } from "react-router-dom";
// import LevelMaster from "./components/LevelMaster";
// import QuestionMaster from "./components/QuestionMaster";
// import EmployeeMaster from"./components/EmployeeMaster";
// import Signup from "./components/Signup";
// import TestMaster from"./components/TestMaster"

// function App() {
//   return (
//     <BrowserRouter>
//       <Routes>
//         <Route path="/" element={<EmployeeMaster />} />
//         <Route path="/signup" element={<Signup />} />
//         <Route path="/LevelMaster" element={<LevelMaster />} />
        
//         {/* ✅ NEW ROUTE */}
//         <Route path="/question" element={<QuestionMaster />} />
//         <Route path="/testmaster" element={<TestMaster />} />
        
//       </Routes>
//     </BrowserRouter>
//   );
// }

// export default App;


import { BrowserRouter, Routes, Route } from "react-router-dom";
import LevelMaster    from "./components/LevelMaster";
import QuestionMaster from "./components/QuestionMaster";
import EmployeeMaster from "./components/EmployeeMaster";
import Signup         from "./components/Signup";
import TestMaster     from "./components/TestMaster";
import ProtectedRoute from "./components/ProtectedRoute";  // ✅ import

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes — login இல்லாமல் access */}
        <Route path="/"       element={<EmployeeMaster />} />
        <Route path="/signup" element={<Signup />} />

        {/* Admin only */}
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

        {/* Employee only */}
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