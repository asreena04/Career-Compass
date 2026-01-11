import { Routes, Route, Outlet } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoutes"; // Verified naming
import Header from "./components/Header"; // Your new consolidated header

// Pages
import SignInPage from "./pages/SignInPage.jsx";
import UserProfilePage from "./pages/UserProfilePage.jsx";
import StudentDashboard from "./pages/student/StudentDashboard";
import StudentRoadmap from "./pages/student/StudentRoadmap";
import StudentSubmissions from "./pages/student/StudentSubmissions";
import StudentMyAppointmentPage from "./pages/StudentMyAppointmentPage.jsx";
import AdvisorMyAppointmentPage from "./pages/AdvisorMyAppointmentPage.jsx"
import AdvisorHomepage from "./pages/AdvisorHomepage.jsx";
import StudentManagementPage from "./pages/StudentManagementPage.jsx";
import StudentAppointmentBooking from "./components/StudentAppointmentBooking.jsx";
import CompetitionPostPage from "./pages/CompetitionPostPage.jsx";
import EditDeleteCompetitionPage from "./pages/EditDeleteCompetitionPage.jsx";
import JobPostPage from "./pages/JobPostPage.jsx";
import EditDeleteJobPage from "./pages/EditDeleteJobPage.jsx";
import CareerCompassPage from "./pages/CareerCompassPage.jsx";
import CompanyHomePage from "./pages/CompanyHomePage.jsx";
import StudentViewCompetitionPage from "./pages/StudentViewCompetitionPage.jsx";
import StudentViewJobPage from "./pages/StudentViewJobPage.jsx";
import CV from "./pages/cvGenerator.jsx";
import ProofManagement from "./components/ProofManagement.jsx";
import AdvisorSkillsTracker from "./components/AdvisorSkillTracker.jsx";
import AdminUsersPage from "./pages/AdminUsersPage.jsx";
import AdminCompetitionsPage from "./pages/AdminCompetitionsPage.jsx";



// Layout for pages WITH the consolidated header
function MainLayout() {
  return (
    <>
      <Header />
      <main className="pt-2"> 
        <Outlet />
      </main>
    </>
  );
}

// Layout for pages WITHOUT header (e.g., Login screen)
function NoHeaderLayout() {
  return <Outlet />;
}

export default function App() {
  return (
    <Routes>
      {/* ================= NO HEADER ROUTES ================= */}
      <Route element={<NoHeaderLayout />}>
        <Route path="/" element={<SignInPage />} />
        <Route path="/sign-in" element={<SignInPage />} />
      </Route>

      {/* ================= MAIN ROUTES (WITH HEADER) ================= */}
      <Route element={<MainLayout />}>
        
        {/* Public/Shared Profile */}
        <Route path="/view-user-profile" element={<UserProfilePage />} />
        <Route path="/home" element={<CareerCompassPage />} />

        {/* ================= ADVISOR ================= */}
        <Route 
          path="/advisorHomePage" 
          element={<ProtectedRoute allow={["Academic Advisor"]}><AdvisorHomepage /></ProtectedRoute>}
        />
        <Route 
          path="/student-management" 
          element={<ProtectedRoute allow={["Academic Advisor"]}><StudentManagementPage /></ProtectedRoute>}
        />
        <Route 
          path="/proof-verification" 
          element={<ProtectedRoute allow={["Academic Advisor"]}><ProofManagement /></ProtectedRoute>}
        />
        <Route 
          path="/advisor/appointments" 
          element={<ProtectedRoute allow={["Academic Advisor"]}><AdvisorMyAppointmentPage /></ProtectedRoute>}
        />
        <Route 
          path="/advisor/student-progress" 
          element={<ProtectedRoute allow={["Academic Advisor"]}><AdvisorSkillsTracker /></ProtectedRoute>}
        />

        {/* ================= STUDENT ================= */}
        <Route 
          path="/student/dashboard" 
          element={<ProtectedRoute allow={["Student"]}><StudentDashboard /></ProtectedRoute>}
        />
        <Route
          path="/student/appointments"
          element={<ProtectedRoute allow={["Student"]}><StudentAppointmentBooking /></ProtectedRoute>}
        />
        <Route
          path="/student-view-competition"
          element={<ProtectedRoute allow={["Student"]}><StudentViewCompetitionPage /></ProtectedRoute>}
        />
        <Route
          path="/student-view-job"
          element={<ProtectedRoute allow={["Student"]}><StudentViewJobPage /></ProtectedRoute>}
        />
        <Route 
          path="/student/roadmap" 
          element={<ProtectedRoute allow={["Student"]}><StudentRoadmap /></ProtectedRoute>}
        />
        <Route 
          path="/cv" 
          element={<ProtectedRoute allow={["Student"]}><CV /></ProtectedRoute>}
        />
        <Route 
          path="/student/submissions" 
          element={<ProtectedRoute allow={["Student"]}><StudentSubmissions /></ProtectedRoute>}
        />
        <Route 
          path="/student/my-appointments" 
          element={<ProtectedRoute allow={["Student"]}><StudentMyAppointmentPage /></ProtectedRoute>}
        />

        {/* ================= COMPANY ================= */}
        <Route 
          path="/company-home-page" 
          element={<ProtectedRoute allow={["Company"]}><CompanyHomePage /></ProtectedRoute>}
        />
        <Route 
          path="/post-competition" 
          element={<ProtectedRoute allow={["Company"]}><CompetitionPostPage /></ProtectedRoute>}
        />
        <Route 
          path="/edit-delete-competition" 
          element={<ProtectedRoute allow={["Company"]}><EditDeleteCompetitionPage /></ProtectedRoute>}
        />
        <Route 
          path="/post-job" 
          element={<ProtectedRoute allow={["Company"]}><JobPostPage /></ProtectedRoute>}
        />
        <Route 
          path="/edit-delete-job" 
          element={<ProtectedRoute allow={["Company"]}><EditDeleteJobPage /></ProtectedRoute>}
        />
        {/* ================= ADMIN ================= */}
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute allow={["Admin"]}><AdminUsersPage /></ProtectedRoute>}
        />
        <Route
          path="/admin/competitions"
          element={<ProtectedRoute allow={["Admin"]}><AdminCompetitionsPage /></ProtectedRoute>}
        />
      </Route>
    </Routes>
  );
}