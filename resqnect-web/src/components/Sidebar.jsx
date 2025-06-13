import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth, signOut } from "firebase/auth";
import { logActivity } from "../utils/logger";

const Sidebar = ({ isOpen, toggleSidebar }) => {
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const navigate = useNavigate();
    const auth = getAuth();

    const handleNavigation = (path) => {
        toggleSidebar();
        navigate(path);
    };

    const handleLogout = () => {
        setShowLogoutModal(true);
    };

    const confirmLogout = async () => {
        try {
            const adminName = localStorage.getItem('adminName') || 'Admin';
            const adminRole = localStorage.getItem('adminRole') || 'Admin';
            await logActivity(
                `${adminName} (${adminRole})`,
                "Admin logout",
                "login"
            );
            
            await signOut(auth);
            navigate("/");
        } catch (error) {
            console.error("Logout error:", error);
        }
    };

    const cancelLogout = () => {
        setShowLogoutModal(false);
    };

    return (
        <>
            {/* Sidebar */}
            <div id="sidebar" className={`fixed top-0 left-0 h-full w-[250px] bg-white shadow-lg transform ${isOpen ? "translate-x-0" : "-translate-x-full"} transition-transform duration-300 ease-in-out z-50`}>
                {/* Close Button */}
                <button onClick={toggleSidebar} className="absolute top-4 right-4 text-2xl text-[#444444] hover:text-black cursor-pointer">
                    &times;
                </button>

                {/* Logo */}
                <div className="p-5 flex items-center space-x-2">
                    <img src="/images/logo.png" alt="Logo" className="w-[40px] h-[40px]" />
                    <span className="text-[#1848a0] font-bold text-lg">RESQNECT</span>
                </div>

                {/* Menu Items */}
                <nav className="mt-6">
                   <button
                   onClick={() => handleNavigation("/emergency-assistance")}
                   className="w-full text-left py-4 px-6 text-[#444444] font-semibold hover:bg-blue-200"
                   >
                        Assistance Request
                   </button>
                   <button
                    onClick={() => handleNavigation("/team-management")}
                    className="w-full text-left py-4 px-6 text-[#444444] font-semibold hover:bg-blue-200"
                   >
                        Team Management
                   </button>
                   <button
                   onClick={() => handleNavigation("/user-management")}
                   className="w-full text-left py-4 px-6 text-[#444444] font-semibold hover:bg-blue-200"
                   >
                        User Management
                   </button>
                   <button
                   onClick={() => handleNavigation("/archive")}
                   className="w-full text-left py-4 px-6 text-[#444444] font-semibold hover:bg-blue-200"
                   >
                        Archived Records
                   </button>
                   {/* Only show Admin Management and Log Trail for superadmin */}
                   {localStorage.getItem('adminRole') === 'superadmin' && (
                     <>
                       <button
                       onClick={() => handleNavigation("/admin-management")}
                       className="w-full text-left py-4 px-6 text-[#444444] font-semibold hover:bg-blue-200"
                       >
                            Admin Management
                       </button>
                       <button
                       onClick={() => handleNavigation("/log-trail")}
                       className="w-full text-left py-4 px-6 text-[#444444] font-semibold hover:bg-blue-200"
                       >
                            Log Trail
                       </button>
                     </>
                   )}
                   <button
                   onClick={handleLogout}
                   className="w-full text-left py-4 px-6 text-[#444444] font-semibold hover:bg-red-200"
                   >
                        Logout
                   </button>
                </nav>
            </div>

            {/* Logout Confirmation Modal */}
            {showLogoutModal && (
                <div className="fixed inset-0 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-lg p-6 w-[300px] text-center space-y-4">
                        <p className="text-lg font-semibold text-[#444444]">Are you sure you want to logout?</p>
                        <div className="flex justify-center gap-4 mt-4">
                            <button onClick={confirmLogout} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md">
                                Yes
                            </button>
                            <button onClick={cancelLogout} className="bg-gray-300 hover:bg-gray-400 text-[#444444] px-4 py-2 rounded-md">
                                No
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default Sidebar;
