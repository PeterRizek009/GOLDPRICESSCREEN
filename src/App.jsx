import { Navigate, Route, Routes } from "react-router-dom";
import AddUserPage from "./pages/AddUserPage.jsx";
import LoginPage from "./pages/LoginPage";
import ChangePasswordPage from "./pages/ChangePasswordPage";
import DashboardPage from "./pages/DashboardPage";
import CompanyDashboardPage from "./pages/CompanyDashboardPage.jsx";
import CompanyScreenPage from "./pages/CompanyScreenPage.jsx";


function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />

      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/change-password"
        element={<ChangePasswordPage />}
      />
      <Route path="/company/screen" element={<CompanyScreenPage />} />
      <Route path="/company/dashboard" element={<CompanyDashboardPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/screen/:code" element={<CompanyScreenPage />} />
      <Route
        path="/admin/users/new"
        element={<AddUserPage />}
      />

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;