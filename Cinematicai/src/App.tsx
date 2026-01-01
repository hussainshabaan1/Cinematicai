import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/components/AuthProvider';
import { useAuth } from '@/stores/authStore';
import { Header } from '@/components/layout/Header';

// Pages
import LandingPage from '@/pages/LandingPage';
import LoginPage from '@/pages/LoginPage';
import ProjectsPage from '@/pages/ProjectsPage';
import CreateProjectPage from '@/pages/CreateProjectPage';
import ProjectDetailPage from '@/pages/ProjectDetailPage';
import AdminApiKeysPage from '@/pages/AdminApiKeysPage';
import AdminPlansPage from '@/pages/AdminPlansPage';
import AdminUsersPage from '@/pages/AdminUsersPage';
import PricingPage from '@/pages/PricingPage';

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <div className="min-h-screen bg-background text-foreground">
            <Header />
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route
                path="/projects"
                element={
                  <ProtectedRoute>
                    <ProjectsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/projects/new"
                element={
                  <ProtectedRoute>
                    <CreateProjectPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/projects/:id"
                element={
                  <ProtectedRoute>
                    <ProjectDetailPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/pricing"
                element={<PricingPage />}
              />
              <Route
                path="/admin/api-keys"
                element={
                  <ProtectedRoute>
                    <AdminApiKeysPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/plans"
                element={
                  <ProtectedRoute>
                    <AdminPlansPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <ProtectedRoute>
                    <AdminUsersPage />
                  </ProtectedRoute>
                }
              />
            </Routes>
            <Toaster />
          </div>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
