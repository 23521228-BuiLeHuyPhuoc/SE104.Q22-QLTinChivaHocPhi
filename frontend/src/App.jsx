import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

// Import Layouts
import { AdminLayout } from './components/admin';
import { StudentLayout } from './components/student';

// Import Pages - Admin
import { AdminDashboard } from './pages/admin';
import Students from './pages/Students';
import Courses from './pages/Courses';
import Classes from './pages/Classes';
import Registrations from './pages/Registrations';
import Tuition from './pages/Tuition';
import Payments from './pages/Payments';
import Semesters from './pages/Semesters';
import Reports from './pages/Reports';

// Import Pages - Student
import { StudentDashboard, StudentProfile, StudentNotifications } from './pages/student';
import CourseRegistration from './pages/CourseRegistration';
import MyCourses from './pages/MyCourses';
import MyTuition from './pages/MyTuition';
import MyPayments from './pages/MyPayments';
import MySchedule from './pages/MySchedule';

// Import Pages - Shared
import Login from './pages/Login';

// Import Styles
import './styles/theme.css';
import './App.css';

// Auto redirect component based on role
const RoleBasedRedirect = () => {
  const { isAdmin, isAuthenticated, loading } = useAuth();
  
  if (loading) return <div className="loading-screen">Đang tải...</div>;
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return isAdmin ? <Navigate to="/admin/dashboard" replace /> : <Navigate to="/student/dashboard" replace />;
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Routes>
            {/* Public route */}
          <Route path="/login" element={<Login />} />
          
          {/* Admin routes - Separate layout for admin */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="students" element={<Students />} />
            <Route path="courses" element={<Courses />} />
            <Route path="classes" element={<Classes />} />
            <Route path="registrations" element={<Registrations />} />
            <Route path="tuition" element={<Tuition />} />
            <Route path="payments" element={<Payments />} />
            <Route path="semesters" element={<Semesters />} />
            <Route path="reports" element={<Reports />} />
            <Route index element={<Navigate to="dashboard" replace />} />
          </Route>
          
          {/* Student routes - Separate layout for student */}
          <Route path="/student" element={<StudentLayout />}>
            <Route path="dashboard" element={<StudentDashboard />} />
            <Route path="schedule" element={<MySchedule />} />
            <Route path="courses" element={<MyCourses />} />
            <Route path="registration" element={<CourseRegistration />} />
            <Route path="tuition" element={<MyTuition />} />
            <Route path="payments" element={<MyPayments />} />
            <Route path="profile" element={<StudentProfile />} />
            <Route path="notifications" element={<StudentNotifications />} />
            <Route index element={<Navigate to="dashboard" replace />} />
          </Route>
          
          {/* Root and catch-all redirect */}
          <Route path="/" element={<RoleBasedRedirect />} />
          <Route path="*" element={<RoleBasedRedirect />} />
        </Routes>
      </Router>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
      />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
