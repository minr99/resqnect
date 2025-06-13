import React, { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import { db } from "../firebase/firebaseConfig";
import { collection, onSnapshot, query, where, doc, updateDoc, getDocs } from "firebase/firestore";
import BarangayDetailsModal from "../components/BarangayDetailsModal";
import ResidentDetailsModal from "../components/ResidentDetailModal";
import PrivacyPolicyModal from "../components/PrivacyPolicyModal";
import { logActivity } from "../utils/logger";

const ArchivePage = () => {
    // State for sidebar toggle
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    
    // State for storing data
    const [archivedBarangays, setArchivedBarangays] = useState([]);
    const [archivedResidents, setArchivedResidents] = useState([]);
    
    // State for modals
    const [selectedBarangay, setSelectedBarangay] = useState(null);
    const [selectedResident, setSelectedResident] = useState(null);
    const [showAssistanceHistory, setShowAssistanceHistory] = useState(false);
    const [assistanceHistory, setAssistanceHistory] = useState([]);
    const [selectedBarangayForHistory, setSelectedBarangayForHistory] = useState(null);
    
    // State for filters
    const [searchTerm, setSearchTerm] = useState("");
    const [activeTab, setActiveTab] = useState("barangays"); // "barangays" or "residents"

    const [isPrivacyPolicyOpen, setIsPrivacyPolicyOpen] = useState(false);

    // Toggle sidebar function
    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    // Set up real-time listeners for archived items
    useEffect(() => {
        // Real-time listener for archived barangays
        const barangayQuery = query(
            collection(db, "barangays"),
            where("status", "==", "archived")
        );
        
        const barangayUnsubscribe = onSnapshot(barangayQuery, (snapshot) => {
            const barangayData = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }));
            setArchivedBarangays(barangayData);
        });

        // Real-time listener for archived residents
        const residentQuery = query(
            collection(db, "residents"),
            where("status", "==", "archived")
        );
        
        const residentUnsubscribe = onSnapshot(residentQuery, (snapshot) => {
            const residentData = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }));
            setArchivedResidents(residentData);
        });

        // Cleanup function
        return () => {
            barangayUnsubscribe();
            residentUnsubscribe();
        };
    }, []);

    // Filter function for both barangays and residents
    const filteredItems = activeTab === "barangays" 
        ? archivedBarangays.filter(item => 
            item.barangayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.id?.toLowerCase().includes(searchTerm.toLowerCase()))
        : archivedResidents.filter(item =>
            item.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.id?.toLowerCase().includes(searchTerm.toLowerCase()));

    const handleUnarchiveBarangay = async (barangay) => {
        try {
            const barangayRef = doc(db, "barangays", barangay.id);
            await updateDoc(barangayRef, {
                status: "active",
                unarchivedAt: new Date(),
                previousStatus: "archived"
            });

            // Log the activity
            const adminName = localStorage.getItem('adminName') || 'Admin';
            await logActivity(
                adminName,
                `Unarchived barangay: ${barangay.barangayName}`,
                'user_management'
            );

            alert("Barangay has been unarchived successfully. They can now log in again.");
        } catch (error) {
            console.error("Unarchive error:", error);
            alert("Failed to unarchive barangay.");
        }
    };

    const handleUnarchiveResident = async (resident, newBarangayId) => {
        try {
            // Get the new barangay details
            const newBarangayDoc = await getDocs(doc(db, "barangays", newBarangayId));
            const newBarangayData = newBarangayDoc.data();

            const residentRef = doc(db, "residents", resident.id);
            await updateDoc(residentRef, {
                status: "active",
                unarchivedAt: new Date(),
                previousStatus: "archived",
                barangay: newBarangayData.barangayName,
                previousBarangay: resident.barangay,
                migratedAt: new Date(),
                migrationReason: "Unarchived and reassigned"
            });

            // Log the activity
            const adminName = localStorage.getItem('adminName') || 'Admin';
            await logActivity(
                adminName,
                `Unarchived resident: ${resident.fullName} and assigned to ${newBarangayData.barangayName}`,
                'user_management'
            );

            alert("Resident has been unarchived successfully and assigned to the selected barangay.");
        } catch (error) {
            console.error("Unarchive error:", error);
            alert("Failed to unarchive resident.");
        }
    };

    // Function to fetch assistance history
    const fetchAssistanceHistory = async (barangayName) => {
        try {
            const q = query(
                collection(db, "assistance_request"),
                where("barangay", "==", barangayName)
            );
            
            const querySnapshot = await getDocs(q);
            const history = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })).sort((a, b) => b.timestamp?.toDate() - a.timestamp?.toDate());
            
            setAssistanceHistory(history);
            setSelectedBarangayForHistory(barangayName);
            setShowAssistanceHistory(true);
        } catch (error) {
            console.error("Error fetching assistance history:", error);
            alert("Failed to fetch assistance history.");
        }
    };

    return (
        <div className="min-h-screen bg-[#99C4E9] flex">
            {/* Dark overlay when any modal is open */}
            {(isPrivacyPolicyOpen) && (
                <div className="fixed inset-0 bg-black/40 z-40" />
            )}
            <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />

            <div className="flex-1 flex flex-col">
                {/* Header */}
                <header className="bg-white w-full flex items-center justify-between px-3 py-4 shadow-md">
                    <div className="flex items-center space-x-2">
                        <button onClick={toggleSidebar}>
                            <img
                                src="/images/menu.png"
                                alt="Menu"
                                className="w-[35px] h-[30px] cursor-pointer"
                            />
                        </button>
                        <img
                            src="/images/logo.png"
                            alt="Logo"
                            className="w-[40px] h-[40px]"
                        />
                    </div>
                    <h1 className="text-[#1848a0] text-[28px] font-bold drop-shadow-md">
                        ARCHIVED RECORDS
                    </h1>
                    <div className="flex items-center space-x-4">
                        <span className="text-black text-[17px] font-semibold">
                            {localStorage.getItem('adminRole') === 'superadmin' ? 'Superadmin' : localStorage.getItem('adminName')}
                        </span>
                        <img
                            src="/images/user.png"
                            alt="Profile"
                            className="w-[40px] h-[40px]"
                        />
                    </div>
                </header>

                {/* Content */}
                <main className="flex-grow px-10 py-6 space-y-6">
                    {/* Tabs and Search */}
                    <div className="bg-white border border-[#444444] rounded-[15px] p-4 flex flex-wrap items-center justify-between shadow-md">
                        <div className="flex space-x-4">
                            <button
                                onClick={() => setActiveTab("barangays")}
                                className={`px-4 py-2 rounded-full ${
                                    activeTab === "barangays"
                                        ? "bg-[#1848a0] text-white"
                                        : "bg-gray-200 text-gray-700"
                                }`}
                            >
                                Archived Barangays
                            </button>
                            <button
                                onClick={() => setActiveTab("residents")}
                                className={`px-4 py-2 rounded-full ${
                                    activeTab === "residents"
                                        ? "bg-[#1848a0] text-white"
                                        : "bg-gray-200 text-gray-700"
                                }`}
                            >
                                Archived Residents
                            </button>
                        </div>

                        <input
                            type="text"
                            placeholder={`Search ${activeTab}...`}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="border border-[#0077b6] rounded-full px-4 py-1 w-[300px] focus:outline-none focus:ring-2 focus:ring-[#0077B6]"
                        />
                    </div>

                    {/* Table */}
                    <div className="bg-white border border-[#444444] rounded-[15px] overflow-x-auto shadow-md">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-[#1E3A5F] text-white text-left">
                                    {activeTab === "barangays" ? (
                                        <>
                                            <th className="p-3 text-center">Barangay ID</th>
                                            <th className="p-3 text-center">Barangay Name</th>
                                            <th className="p-3 text-center">Captain Name</th>
                                            <th className="p-3 text-center">Archived At</th>
                                            <th className="p-3 text-center">Reason</th>
                                            <th className="p-3 text-center">Actions</th>
                                        </>
                                    ) : (
                                        <>
                                            <th className="p-3 text-center">Resident ID</th>
                                            <th className="p-3 text-center">Full Name</th>
                                            <th className="p-3 text-center">Barangay</th>
                                            <th className="p-3 text-center">Archived At</th>
                                            <th className="p-3 text-center">Reason</th>
                                            <th className="p-3 text-center">Archived By</th>
                                            <th className="p-3 text-center">Actions</th>
                                        </>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="text-[#444444] bg-white">
                                {filteredItems.length === 0 ? (
                                    <tr>
                                        <td colSpan={activeTab === "barangays" ? "6" : "7"} className="text-center py-6 text-gray-500">
                                            No archived {activeTab} found.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredItems.map((item) => (
                                        <tr
                                            key={item.id}
                                            className="border-t hover:bg-gray-100"
                                        >
                                            <td className="p-2 text-center text-blue-600 font-bold">
                                                #{item.id.slice(0, 6).toUpperCase()}
                                            </td>
                                            <td className="p-3 text-center">
                                                {activeTab === "barangays" ? item.barangayName : item.fullName}
                                            </td>
                                            <td className="p-3 text-center">
                                                {activeTab === "barangays" ? item.captainName : item.barangay}
                                            </td>
                                            <td className="p-3 text-center">
                                                {item.archivedAt?.toDate ? item.archivedAt.toDate().toLocaleString() : 'N/A'}
                                            </td>
                                            <td className="p-3 text-center">
                                                {item.archiveReason || 'N/A'}
                                            </td>
                                            {activeTab === "residents" && (
                                                <td className="p-3 text-center">
                                                    {item.archivedBy === 'admin' ? 'Admin' : 
                                                     item.archivedByBarangay ? `Barangay ${item.archivedByBarangay}` : 'N/A'}
                                                </td>
                                            )}
                                            <td className="p-3 text-center">
                                                <div className="flex justify-center space-x-2">
                                                    <button
                                                        className="text-blue-600 hover:underline"
                                                        onClick={() => {
                                                            if (activeTab === "barangays") {
                                                                setSelectedBarangay(item);
                                                            } else {
                                                                setSelectedResident(item);
                                                            }
                                                        }}
                                                    >
                                                        View Details
                                                    </button>
                                                    {activeTab === "barangays" && (
                                                        <button
                                                            className="text-green-600 hover:underline"
                                                            onClick={() => fetchAssistanceHistory(item.barangayName)}
                                                        >
                                                            View History
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Assistance History Modal */}
                    {showAssistanceHistory && (
                        <>
                            <div className="fixed inset-0 bg-black/40 z-40" />
                            <div className="fixed inset-0 flex items-center justify-center z-50">
                                <div className="bg-white rounded-lg p-6 w-[90%] max-w-6xl max-h-[80vh] overflow-y-auto">
                                    <div className="flex justify-between items-center mb-4">
                                        <h2 className="text-xl font-bold text-[#1E3A5F]">
                                            Assistance History - {selectedBarangayForHistory}
                                        </h2>
                                        <button
                                            onClick={() => {
                                                setShowAssistanceHistory(false);
                                                setAssistanceHistory([]);
                                                setSelectedBarangayForHistory(null);
                                            }}
                                            className="text-gray-500 hover:text-gray-700"
                                        >
                                            ✕
                                        </button>
                                    </div>

                                    <div className="overflow-x-auto">
                                        <table className="w-full border-collapse">
                                            <thead>
                                                <tr className="bg-[#1E3A5F] text-white">
                                                    <th className="p-3 text-center">Request ID</th>
                                                    <th className="p-3 text-center">Resident Name</th>
                                                    <th className="p-3 text-center">Emergency Type</th>
                                                    <th className="p-3 text-center">Status</th>
                                                    <th className="p-3 text-center">Admin Status</th>
                                                    <th className="p-3 text-center">Requested At</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {assistanceHistory.length === 0 ? (
                                                    <tr>
                                                        <td colSpan="6" className="text-center py-4 text-gray-500">
                                                            No assistance history found.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    assistanceHistory.map((request) => (
                                                        <tr key={request.id} className="border-t hover:bg-gray-50">
                                                            <td className="p-3 text-center text-blue-600 font-bold">
                                                                #{request.id.slice(0, 6).toUpperCase()}
                                                            </td>
                                                            <td className="p-3 text-center">{request.fullName}</td>
                                                            <td className="p-3 text-center">{request.assistanceType || 'N/A'}</td>
                                                            <td className="p-3 text-center">
                                                                <span className={`px-2 py-1 rounded-full text-sm ${
                                                                    request.status === 'Handled' ? 'bg-green-100 text-green-800' :
                                                                    request.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                                                                    'bg-yellow-100 text-yellow-800'
                                                                }`}>
                                                                    {request.status}
                                                                </span>
                                                            </td>
                                                            <td className="p-3 text-center">
                                                                <span className={`px-2 py-1 rounded-full text-sm ${
                                                                    request.adminStatus === 'Completed' ? 'bg-green-100 text-green-800' :
                                                                    request.adminStatus === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                                                                    'bg-yellow-100 text-yellow-800'
                                                                }`}>
                                                                    {request.adminStatus}
                                                                </span>
                                                            </td>
                                                            <td className="p-3 text-center">
                                                                {request.timestamp?.toDate().toLocaleString()}
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </main>

                {/*FOOTER*/}
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
            </div>

            {/* Modals */}
            {selectedBarangay && (
                <BarangayDetailsModal
                    barangay={selectedBarangay}
                    onClose={() => setSelectedBarangay(null)}
                    onUnarchive={handleUnarchiveBarangay}
                />
            )}
            {selectedResident && (
                <ResidentDetailsModal
                    resident={selectedResident}
                    onClose={() => setSelectedResident(null)}
                    onUnarchive={handleUnarchiveResident}
                />
            )}
            {/* Privacy Policy Modal */}
            <PrivacyPolicyModal
                    isOpen={isPrivacyPolicyOpen}
                    onClose={() => setIsPrivacyPolicyOpen(false)}
                />
        </div>
    );
};

export default ArchivePage; 