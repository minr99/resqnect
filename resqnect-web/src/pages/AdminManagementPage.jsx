import React, { useEffect, useState} from "react";
import Sidebar from "../components/Sidebar";
import { db } from "../firebase/firebaseConfig";
import { collection, onSnapshot, addDoc, updateDoc, doc, deleteDoc, getDoc } from "firebase/firestore";
import bcrypt from "bcryptjs";
import { Search, X } from "lucide-react";
import PrivacyPolicyModal from "../components/PrivacyPolicyModal";
import { logActivity } from "../utils/logger";

const AdminManagementPage = () => {
    //sidebar toggle
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    //storing data
    const [admins, setAdmins] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    //new admin form
    const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
    const [newAdmin, setNewAdmin] = useState({
        name: "",
        username: "",
        password: "",
        confirmPassword: "",
        status: "active"
    });

    const [isPrivacyPolicyOpen, setIsPrivacyPolicyOpen] = useState(false);

    const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
    const [selectedAdmin, setSelectedAdmin] = useState(null);
    const [newPassword, setNewPassword] = useState({
        currentPassword: "",
        password: "",
        confirmPassword: ""
    });

    //sidebar function
    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    //real-time listener for admins
    useEffect(() => {
        setIsLoading(true);
        setError(null);

        const unsubscribe = onSnapshot(
            collection(db, "admins"),
            (snapshot) => {
                const adminData = snapshot.docs.map((doc)=> ({
                    id: doc.id,...doc.data(),
                }));
                setAdmins(adminData);
                setIsLoading(false);
            },
            (error) => {
                console.error("Error fetching admins:", error);
                setError("Failed to load admin data. Please try again.");
                setIsLoading(false);
            }
        );

        return () => unsubscribe();
    },[]);

    //filter admins
    const filteredAdmins = admins.filter((admin) => {
        const searchTermLower = searchTerm.toLowerCase();
        const nameMatch = admin.name?.toLowerCase().includes(searchTermLower);
        const usernameMatch = admin.username?.toLowerCase().includes(searchTermLower);
        
        const matchesSearch = nameMatch || usernameMatch;
        
        const matchesStatus = statusFilter === "all" || admin.status === statusFilter;
        
        return matchesSearch && matchesStatus;
    });

    // Password validation function
    const validatePassword = (password) => {
        const hasLetter = /[a-zA-Z]/.test(password);
        const hasNumber = /[0-9]/.test(password);
        const isLongEnough = password.length >= 8;
        
        if (!hasLetter || !hasNumber || !isLongEnough) {
            alert("Password must be at least 8 characters long and contain both letters and numbers!");
            return false;
        }
        return true;
    };

    //adding new admin
    const handleAddAdmin = async (e) => {
        e.preventDefault();
        
        // Check if passwords match
        if (newAdmin.password !== newAdmin.confirmPassword) {
            alert("Passwords do not match!");
            return;
        }

        // Validate password
        if (!validatePassword(newAdmin.password)) {
            return;
        }

        try {
            //hash password
            const hashedPassword = await bcrypt.hash(newAdmin.password, 10);

            await addDoc(collection(db, "admins"), {
                name: newAdmin.name,
                username: newAdmin.username,
                password: hashedPassword,
                status: newAdmin.status,
                isFirstLogin: true,
                createdAt: new Date()
            });

            // Log the activity
            const adminName = localStorage.getItem('adminName') || 'Admin';
            const adminRole = localStorage.getItem('adminRole') || 'Admin';
            await logActivity(
                `${adminName} (${adminRole})`,
                `Added new admin: ${newAdmin.name} (${newAdmin.username})`,
                'admin_management'
            );

            //reset
            setNewAdmin({
                name: "",
                username: "",
                password: "",
                confirmPassword: "",
                status: "active"
            });
            setIsAdminModalOpen(false);
        } catch (error) {
            console.error("Error adding admin:", error);
            alert("Failed to add admin. Please try again.");
        }
    };

    //admin status toggle
    const handleStatusToggle = async (adminId, currentStatus) => {
        try {
            const newStatus = currentStatus === "active" ? "inactive" : "active";
            const adminRef = doc(db, "admins", adminId);
            const adminDoc = await getDoc(adminRef);
            const adminData = adminDoc.data();

            await updateDoc(adminRef, {
                status: newStatus
            });

            // Log the activity
            const adminName = localStorage.getItem('adminName') || 'Admin';
            const adminRole = localStorage.getItem('adminRole') || 'Admin';
            await logActivity(
                `${adminName} (${adminRole})`,
                `${newStatus === 'active' ? 'Activated' : 'Deactivated'} admin: ${adminData.name} (${adminData.username})`,
                'admin_management'
            );
        } catch (error) {
            console.error("Error updating admin status:", error);
            alert("Failed to update admin status.");
        }
    };

    //admin deletion
    const handleDeleteAdmin = async (adminId) => {
        if(window.confirm("Are you sure you want to delete this admin?")) {
            try {
                const adminRef = doc(db, "admins", adminId);
                const adminDoc = await getDoc(adminRef);
                const adminData = adminDoc.data();

                await deleteDoc(adminRef);

                // Log the activity
                const adminName = localStorage.getItem('adminName') || 'Admin';
                const adminRole = localStorage.getItem('adminRole') || 'Admin';
                await logActivity(
                    `${adminName} (${adminRole})`,
                    `Deleted admin: ${adminData.name} (${adminData.username})`,
                    'admin_management'
                );
            } catch (error) {
                console.error("Error deleting admin:", error);
                alert("Failed to delete admin.");
            }
        }
    };

    // Function to clear all filters
    const clearFilters = () => {
        setSearchTerm("");
        setStatusFilter("all");
    };

    // Function to check if any filters are active
    const hasActiveFilters = () => {
        return searchTerm !== "" || statusFilter !== "all";
    };

    // Add new function for changing password
    const handleChangePassword = async (e) => {
        e.preventDefault();
        
        if (newPassword.password !== newPassword.confirmPassword) {
            alert("New passwords do not match!");
            return;
        }

        // Validate new password
        if (!validatePassword(newPassword.password)) {
            return;
        }

        try {
            // Verify current password
            const isCurrentPasswordValid = await bcrypt.compare(
                newPassword.currentPassword,
                selectedAdmin.password
            );

            if (!isCurrentPasswordValid) {
                alert("Current password is incorrect!");
                return;
            }

            const hashedPassword = await bcrypt.hash(newPassword.password, 10);
            await updateDoc(doc(db, "admins", selectedAdmin.id), {
                password: hashedPassword,
                isFirstLogin: false
            });

            // Log the activity
            const adminName = localStorage.getItem('adminName') || 'Admin';
            const adminRole = localStorage.getItem('adminRole') || 'Admin';
            await logActivity(
                `${adminName} (${adminRole})`,
                `Changed password for admin: ${selectedAdmin.name} (${selectedAdmin.username})`,
                'admin_management'
            );

            alert("Password updated successfully!");
            setIsChangePasswordModalOpen(false);
            setNewPassword({ currentPassword: "", password: "", confirmPassword: "" });
            setSelectedAdmin(null);
        } catch (error) {
            console.error("Error changing password:", error);
            alert("Failed to change password.");
        }
    };

    return (
        <div className="min-h-screen bg-[#99c4e9] flex">
            <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar}/>

            <div className="flex-1 flex flex-col">
                {/*Header*/}
                <header className="bg-white w-full flex items-center justify-between px-3 py-4 shadow-md">
                    <div className="flex items-center space-x-2">
                        <button onClick={toggleSidebar}>
                            <img src="/images/menu.png" alt="Menu" className="w-[35px] h-[30px] cursor-pointer"/>
                        </button>
                        <img src="/images/logo.png" alt="Logo" className="w-[40px] h-[40px]"/>
                    </div>
                    <h1 className="text-[#1848a0] text-[28px] font-bold drop-shadow-md">
                        ADMIN MANAGEMENT
                    </h1>
                    <div className="flex items-center space-x-4">
                        <span className="text-black text-[17px] font-semibold">
                            {localStorage.getItem('adminRole') === 'superadmin' ? 'Superadmin' : localStorage.getItem('adminName')}
                        </span>
                        <img src="/images/user.png" alt="Profile" className="w-[40px] h-[40px]"/>
                    </div>
                </header>

                {/*Content*/}
                <main className="flex-grow px-10 py-6 space-y-6">
                    {/*Filters*/}
                    <div className="bg-white border border-[#444444] rounded-[15px] p-4 flex flex-wrap items-center space-x-6 shadow-md">
                        <span className="font-bold text-[#444444] text-[16px]">Filter By:</span>
                        
                        {/* Status Filter */}
                        <select 
                            className="border border-[#0077b6] rounded-full px-6 py-1 text-[#444444] focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={statusFilter} 
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="all">All Status</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>

                        {/* Search Input */}
                        <div className="relative flex-1 max-w-[400px]">
                            <input
                                type="text"
                                placeholder="Search by name or username"
                                className="border border-[#0077b6] rounded-full px-4 py-1 w-full pl-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm("")}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>

                        {/* Clear Filters Button */}
                        {hasActiveFilters() && (
                            <button
                                onClick={clearFilters}
                                className="px-4 py-1 text-sm text-[#0077b6] hover:text-[#005b8c] font-medium"
                            >
                                Clear Filters
                            </button>
                        )}
                    </div>

                    {/* Loading and Error States */}
                    {isLoading && (
                        <div className="text-center py-4">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1848a0] mx-auto"></div>
                            <p className="mt-2 text-gray-600">Loading admins...</p>
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                            <strong className="font-bold">Error: </strong>
                            <span className="block sm:inline">{error}</span>
                        </div>
                    )}

                    {/*Admin Table*/}
                    {!isLoading && !error && (
                        <div className="bg-white border border-[#444444] rounded-[15px] overflow-x-auto shadow-md">
                            {filteredAdmins.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    {hasActiveFilters() 
                                        ? "No admins found matching your filters. Try adjusting your search criteria."
                                        : "No admins found in the system."}
                                </div>
                            ) : (
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="bg-[#1e3a5f] text-white text-left">
                                            <th className="p-3 text-center">Admin ID</th>
                                            <th className="p-3 text-center">Name</th>
                                            <th className="p-3 text-center">Username</th>
                                            <th className="p-3 text-center">Status</th>
                                            <th className="p-3 text-center">Created At</th>
                                            <th className="p-3 text-center">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-[#444444] bg-white">
                                        {filteredAdmins.map((admin) => (
                                            <tr key={admin.id} className="border-t hover:bg-gray-100">
                                                <td className="p-2 text-center text-blue-600 font-bold">
                                                    #{admin.id.slice(0, 6).toUpperCase()}
                                                </td>
                                                <td className="p-3 text-center">{admin.name}</td>
                                                <td className="p-3 text-center">{admin.username}</td>
                                                <td className="p-3 text-center">
                                                    <span
                                                        className={`px-3 py-1 rounded-full text-sm font-semibold ${admin.status === "active" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                                                            {admin.status}
                                                    </span>
                                                </td>
                                                <td className="p-3 text-center">
                                                    {admin.createdAt?.toDate().toLocaleString() || "N/A"}
                                                </td>
                                                <td className="p-3 text-center space-x-2">
                                                    {admin.username === "superadmin" ? (
                                                        <button
                                                            onClick={() => {
                                                                setSelectedAdmin(admin);
                                                                setIsChangePasswordModalOpen(true);
                                                            }}
                                                            className="px-3 py-1 rounded bg-blue-500 text-white"
                                                        >
                                                            Change Password
                                                        </button>
                                                    ) : (
                                                        <>
                                                            <button
                                                                onClick={() => handleStatusToggle(admin.id, admin.status)}
                                                                className={`px-3 py-1 rounded ${admin.status === "active" ? "bg-yellow-500 text-white" : "bg-green-500 text-white"}`}
                                                            >
                                                                {admin.status === "active" ? "Deactivate" : "Activate"}
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteAdmin(admin.id)}
                                                                className="px-3 py-1 rounded bg-red-500 text-white"
                                                            >
                                                                Delete
                                                            </button>
                                                        </>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    )}

                    {/*Add Adminbtn*/}
                    <div className="flex justify-end">
                        <button
                            onClick={() => setIsAdminModalOpen(true)}
                            className="bg-[#1848a0] text-white px-6 py-2 rounded-[10px] font-semibold shadow=md hover:bg-[#163d8f] transition cursor-pointer"
                        >
                            + Add Admin
                        </button>
                    </div>
                </main>

                {/*Add Admin Modal*/}
                {isAdminModalOpen && (
                    <div className="fixed inset-0 flex items-center justify-center">
                        <div className="bg-white p-6 rounded-lg w-[500px]">
                            <h2 className="text-2xl font-bold mb-4 text-[#1e3a5f]">Add New Admin</h2>
                            <form onSubmit={handleAddAdmin} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Name</label>
                                    <input 
                                        type="text" 
                                        required 
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" 
                                        value={newAdmin.name} 
                                        onChange={(e) => setNewAdmin({...newAdmin, name: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Username</label>
                                    <input 
                                        type="text" 
                                        required 
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" 
                                        value={newAdmin.username} 
                                        onChange={(e) => setNewAdmin({...newAdmin, username: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Password</label>
                                    <input 
                                        type="password" 
                                        required 
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" 
                                        value={newAdmin.password} 
                                        onChange={(e) => setNewAdmin({...newAdmin, password: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Confirm Password</label>
                                    <input 
                                        type="password" 
                                        required 
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" 
                                        value={newAdmin.confirmPassword} 
                                        onChange={(e) => setNewAdmin({...newAdmin, confirmPassword: e.target.value})}
                                    />
                                </div>
                                <div className="flex justify-end space-x-3 mt-6">
                                    <button 
                                        type="button" 
                                        onClick={() => setIsAdminModalOpen(false)} 
                                        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit" 
                                        className="px-4 py-2 bg-[#1848a0] text-white rounded-md hover:bg-[#163d8f]"
                                    >
                                        Add Admin
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Change Password Modal */}
                {isChangePasswordModalOpen && selectedAdmin && (
                    <div className="fixed inset-0 flex items-center justify-center">
                        <div className="bg-white p-6 rounded-lg w-[500px]">
                            <h2 className="text-2xl font-bold mb-4 text-[#1e3a5f]">Change Password</h2>
                            <form onSubmit={handleChangePassword} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Current Password</label>
                                    <input 
                                        type="password" 
                                        required 
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" 
                                        value={newPassword.currentPassword} 
                                        onChange={(e) => setNewPassword({...newPassword, currentPassword: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">New Password</label>
                                    <input 
                                        type="password" 
                                        required 
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" 
                                        value={newPassword.password} 
                                        onChange={(e) => setNewPassword({...newPassword, password: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Confirm New Password</label>
                                    <input 
                                        type="password" 
                                        required 
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" 
                                        value={newPassword.confirmPassword} 
                                        onChange={(e) => setNewPassword({...newPassword, confirmPassword: e.target.value})}
                                    />
                                </div>
                                <div className="flex justify-end space-x-3 mt-6">
                                    <button 
                                        type="button" 
                                        onClick={() => {
                                            setIsChangePasswordModalOpen(false);
                                            setNewPassword({ currentPassword: "", password: "", confirmPassword: "" });
                                            setSelectedAdmin(null);
                                        }} 
                                        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit" 
                                        className="px-4 py-2 bg-[#1848a0] text-white rounded-md hover:bg-[#163d8f]"
                                    >
                                        Change Password
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/*Footer*/}
                <footer className="bg-white w-full border-t border-black py-4 px-6 flex flex-col md:flex-row items-center justify-between text-[#444444] text-[14px] md:text-[18px]">
                    <span className="font-bold tracking-wide">RESQNECT | 2025</span>
                    <span className="text-center tracking-wide">Developed for Ormoc City Disaster Response</span>
                    <button 
                        className="font-bold tracking-wide cursor-pointer hover:text-[#1848A0] transition-colors"
                        onClick={() => setIsPrivacyPolicyOpen(true)}
                    >
                        Privacy Policy & Terms
                    </button>
                </footer>

                {/* Privacy Policy Modal */}
                <PrivacyPolicyModal
                    isOpen={isPrivacyPolicyOpen}
                    onClose={() => setIsPrivacyPolicyOpen(false)}
                />
            </div>
        </div>
    )

};

export default AdminManagementPage;
