import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import StudentSidebar from './StudentSidebar';
import { Header, Footer, Loading } from '../common';
import './StudentLayout.css';

const StudentLayout = () => {
  const { isAuthenticated, isAdmin, loading } = useAuth();

  if (loading) {
    return <Loading message="Đang tải..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (isAdmin) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return (
    <div className="student-layout">
      <Header />
      <div className="student-body">
        <StudentSidebar />
        <main className="student-content">
          <Outlet />
        </main>
      </div>
      <Footer />
    </div>
  );
};

export default StudentLayout;
