import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth, signOut } from "firebase/auth";
import { logActivity } from "../utils/logger";

const Sidebar_brgy = ({ isOpen, toggleSidebar, barangayId, barangayName }) => {
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const navigate = useNavigate();
    const auth = getAuth();

    const handleNavigation = (path) => {
        toggleSidebar();

        if (barangayId) {
            navigate(path, {
                state: {
                    barangayId,
                    barangayName
                }
            });
        } else {
            navigate("/"); // fallback
        }
    };

    const handleLogout = () => {
        setShowLogoutModal(true);
    };

    const confirmLogout = async () => {
        try {
            const barangayName = localStorage.getItem('barangayName') || 'Barangay User';
            const userType = localStorage.getItem('userType') || 'barangay';
            await logActivity(
                `${barangayName} (${userType})`,
                "Barangay logout",
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
            <div id="sidebar-brgy" className={`fixed top-0 left-0 h-full w-[250px] bg-white shadow-lg transform ${isOpen ? "translate-x-0" : "-translate-x-full"} transition-transform duration-300 ease-in-out z-50`}>
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
                        onClick={() => handleNavigation("/assistance")}
                        className="w-full text-left py-4 px-6 text-[#444444] font-semibold hover:bg-blue-200"
                    >
                        Assistance Request
                    </button>
                    
                    <button
                        onClick={() => handleNavigation("/resident-management")}
                        className="w-full text-left py-4 px-6 text-[#444444] font-semibold hover:bg-blue-200"
                    >
                        Resident Information
                    </button>

                    <button
                        onClick={() => handleNavigation("/archive-records")}
                        className="w-full text-left py-4 px-6 text-[#444444] font-semibold hover:bg-blue-200"
                    >
                        Archived Residents
                    </button>

                    <button
                        onClick={() => handleNavigation("/brgy-profile")}
                        className="w-full text-left py-4 px-6 text-[#444444] font-semibold hover:bg-blue-200"
                    >
                        Profile
                    </button>

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

export default Sidebar_brgy;
