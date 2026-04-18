import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./lib/AuthContext";
import { SiteProvider } from "./lib/SiteContext";
import { Layout } from "./components/Layout";
import { MasterRoll } from "./pages/MasterRoll";
import { Attendance } from "./pages/Attendance";
import { Advances } from "./pages/Advances";
import { Payroll } from "./pages/Payroll";
import { Reports } from "./pages/Reports";
import { Sites } from "./pages/Sites";
import { Login } from "./pages/Login";

function ProtectedRoute({ children, adminOnly = false }: { children: React.ReactNode, adminOnly?: boolean }) {
  const { user, appUser, loading } = useAuth();
  
  if (loading) return <div className="flex h-screen items-center justify-center">Loading...</div>;
  if (!user || !appUser) return <Navigate to="/login" replace />;
  if (adminOnly && appUser.role !== 'admin') return <Navigate to="/" replace />;
  
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SiteProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route index element={<Navigate to="/employees" replace />} />
              <Route path="employees" element={<MasterRoll />} />
              <Route path="attendance" element={<Attendance />} />
              <Route path="advances" element={<Advances />} />
              <Route path="sites" element={<ProtectedRoute adminOnly><Sites /></ProtectedRoute>} />
              <Route path="payroll" element={<ProtectedRoute adminOnly><Payroll /></ProtectedRoute>} />
              <Route path="reports" element={<ProtectedRoute adminOnly><Reports /></ProtectedRoute>} />
            </Route>
          </Routes>
        </SiteProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
