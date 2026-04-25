import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Students from "./pages/Students";
import Circles from "./pages/Circles";
import DailyEvaluation from "./pages/DailyEvaluation";
import DistinguishedCircle from "./pages/DistinguishedCircle";
import WissamMaher from "./pages/WissamMaher";
import MaarijData from "./pages/MaarijData";
import AcademicCalendar from "./pages/AcademicCalendar";
import AppLayout from "./components/AppLayout";
import NotFound from "./pages/NotFound";
import MonitoringPage from "./pages/monitoring";
import SummaryReport from './pages/SummaryReport';

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>جاري التحميل...</p>
      </div>
    );
  if (!user) return <Navigate to="/login" replace />;
  
  
  return <AppLayout>{children}</AppLayout>;
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>جاري التحميل...</p>
      </div>
    );

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
      
      {/* */}
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/students" element={<ProtectedRoute><Students /></ProtectedRoute>} />
      <Route path="/circles" element={<ProtectedRoute><Circles /></ProtectedRoute>} />
      <Route path="/daily-evaluation" element={<ProtectedRoute><DailyEvaluation /></ProtectedRoute>} />
      <Route path="/distinguished-circle" element={<ProtectedRoute><DistinguishedCircle /></ProtectedRoute>} />
      <Route path="/wissam-maher" element={<ProtectedRoute><WissamMaher /></ProtectedRoute>} />
      <Route path="/maarij-data" element={<ProtectedRoute><MaarijData /></ProtectedRoute>} />
      <Route path="/calendar" element={<ProtectedRoute><AcademicCalendar /></ProtectedRoute>} />
      
      {/* */}
      <Route path="/summary" element={<ProtectedRoute><SummaryReport /></ProtectedRoute>}/>
      
      <Route path="/monitoring" element={<ProtectedRoute><MonitoringPage /></ProtectedRoute>} />
      
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;