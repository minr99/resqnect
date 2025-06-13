import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
    // Get user type and role from localStorage
    const userType = localStorage.getItem('userType');
    const adminRole = localStorage.getItem('adminRole');

    // If not logged in, redirect to login
    if (!userType) {
        return <Navigate to="/" replace />;
    }

    // If no specific roles are required, allow access
    if (allowedRoles.length === 0) {
        return children;
    }

    // Check if user's role is allowed
    if (userType === 'admin' && allowedRoles.includes(adminRole)) {
        return children;
    }

    // If role is not allowed, redirect to emergency assistance page
    return <Navigate to="/emergency-assistance" replace />;
};

export default ProtectedRoute; 