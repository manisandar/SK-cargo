import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { RepositoryProvider } from './data';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { DateFilterProvider } from './context/DateFilterContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Layout } from './components/Layout';
import { LoginScreen } from './screens/LoginScreen';
import { LandingScreen } from './screens/LandingScreen';
import { ParcelsScreen } from './screens/ParcelsScreen';
import { RepackingScreen } from './screens/RepackingScreen';
import { CouriersScreen } from './screens/CouriersScreen';
import { CustomersScreen } from './screens/CustomersScreen';
import { AdminDashboardScreen } from './screens/admin/AdminDashboardScreen';
import { AuditLogsScreen } from './screens/admin/AuditLogsScreen';
import { StaffManagementScreen } from './screens/admin/StaffManagementScreen';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF9F6] dark:bg-slate-900 text-slate-500 text-xs font-semibold">
        Loading SK Cargo...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  if (user?.role !== 'admin') {
    return <Navigate to="/parcels" replace />;
  }

  return <>{children}</>;
};

const RoleBasedIndexRedirect: React.FC = () => {
  const { user } = useAuth();
  if (user?.role === 'admin') {
    return <Navigate to="/admin/dashboard" replace />;
  }
  return <Navigate to="/parcels" replace />;
};

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <RepositoryProvider>
          <AuthProvider>
            <DateFilterProvider>
              <BrowserRouter>
                <Routes>
                  <Route path="/landing" element={<LandingScreen />} />
                  <Route path="/home" element={<LandingScreen />} />
                  <Route path="/login" element={<LoginScreen />} />

                  <Route
                    path="/"
                    element={
                      <ProtectedRoute>
                        <Layout />
                      </ProtectedRoute>
                    }
                  >
                    {/* Index Route Redirects Based on Role */}
                    <Route index element={<RoleBasedIndexRedirect />} />

                    {/* Operational Screens */}
                    <Route path="parcels" element={<ParcelsScreen />} />
                    <Route path="repacking" element={<RepackingScreen />} />
                    <Route path="boxes" element={<Navigate to="/repacking" replace />} />
                    <Route path="couriers" element={<CouriersScreen />} />
                    <Route path="customers" element={<CustomersScreen />} />
                    <Route path="receive" element={<Navigate to="/parcels" replace />} />

                    {/* Admin Portal Screens */}
                    <Route
                      path="admin/dashboard"
                      element={
                        <AdminRoute>
                          <AdminDashboardScreen />
                        </AdminRoute>
                      }
                    />
                    <Route
                      path="admin/logs"
                      element={
                        <AdminRoute>
                          <AuditLogsScreen />
                        </AdminRoute>
                      }
                    />
                    <Route
                      path="admin/staff"
                      element={
                        <AdminRoute>
                          <StaffManagementScreen />
                        </AdminRoute>
                      }
                    />

                    {/* Aliases & Redirects */}
                    <Route path="dashboard" element={<Navigate to="/admin/dashboard" replace />} />
                    <Route path="logs" element={<Navigate to="/admin/logs" replace />} />
                    <Route path="staff" element={<Navigate to="/admin/staff" replace />} />
                  </Route>

                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </BrowserRouter>
            </DateFilterProvider>
          </AuthProvider>
        </RepositoryProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export default App;
