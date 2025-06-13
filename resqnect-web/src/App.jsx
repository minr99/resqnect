import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import EmergencyAssistancePage from './pages/EmergencyAssistancePage';
import EmergencyAlertsPage from './pages/EmergencyAlertsPage';
import AssistancePage_brgy from './pages/AssistancePage_brgy';
import TeamManagementPage from './pages/TeamManagementPage';
import UserManagementPage from './pages/UserManagementPage';
import BarangayProfilePage from './pages/BarangayProfilePage';
import ResidentManagementPage from './pages/ResidentManagementPage';
import AdminManagementPage from './pages/AdminManagementPage';
import LogTrailPage from './pages/LogTrailPage';
import ArchivePage from './pages/ArchivePage';
import ArchivePage_brgy from './pages/ArchivePage_brgy';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <Router>
      <Routes>
        <Route path='/' element={<LoginPage />} />
        <Route path='/register' element={<RegisterPage />}/>
        <Route path='/emergency-assistance' element={
          <ProtectedRoute>
            <EmergencyAssistancePage />
          </ProtectedRoute>
        }/>
        <Route path='/emergency-alerts' element={
          <ProtectedRoute>
            <EmergencyAlertsPage />
          </ProtectedRoute>
        }/>
        <Route path='/assistance' element={
          <ProtectedRoute>
            <AssistancePage_brgy/>
          </ProtectedRoute>
        }/>
        <Route path='/team-management' element={
          <ProtectedRoute>
            <TeamManagementPage/>
          </ProtectedRoute>
        }/>
        <Route path='/user-management' element={
          <ProtectedRoute>
            <UserManagementPage/>
          </ProtectedRoute>
        }/>
        <Route path='/archive' element={
          <ProtectedRoute>
            <ArchivePage/>
          </ProtectedRoute>
        }/>
        <Route path='/archive-records' element={
          <ProtectedRoute>
            <ArchivePage_brgy/>
          </ProtectedRoute>
        }/>
        <Route path='/admin-management' element={
          <ProtectedRoute allowedRoles={['superadmin']}>
            <AdminManagementPage/>
          </ProtectedRoute>
        }/>
        <Route path='/log-trail' element={
          <ProtectedRoute allowedRoles={['superadmin']}>
            <LogTrailPage/>
          </ProtectedRoute>
        }/>
        <Route path='/brgy-profile' element={
          <ProtectedRoute>
            <BarangayProfilePage/>
          </ProtectedRoute>
        }/>
        <Route path='/resident-management' element={
          <ProtectedRoute>
            <ResidentManagementPage/>
          </ProtectedRoute>
        }/>
      </Routes>
    </Router> 
  );
}

export default App;
