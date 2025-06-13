import React, { useState, useEffect } from "react";
import Sidebar_brgy from "../components/Sidebar_brgy";
import { useLocation, useNavigate } from "react-router-dom";
import { db } from "../firebase/firebaseConfig";
import { collection, onSnapshot, query, where, doc, updateDoc } from "firebase/firestore";
import ResidentDetailsModal from "../components/ResidentDetailModal";
import PrivacyPolicyModal from "../components/PrivacyPolicyModal";
import { logActivity } from "../utils/logger";

const ArchivePage_brgy = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();

    const [barangayId, setBarangayId] = useState("");
    const [barangayName, setBarangayName] = useState("");
    const [archivedResidents, setArchivedResidents] = useState([]);
    const [selectedResident, setSelectedResident] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [isPrivacyPolicyOpen, setIsPrivacyPolicyOpen] = useState(false);

    useEffect(() => {
        if(location.state?.barangayId) {
            setBarangayId(location.state.barangayId);
            setBarangayName(location.state.barangayName || "Barangay");
        } else {
            alert("Unauthorized access. Login again.");
            navigate("/");
        }
    }, [location, navigate]);

    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    // Set up real-time listener for archived residents
    useEffect(() => {
        if (!barangayName) return;

        const residentQuery = query(
            collection(db, "residents"),
            where("status", "==", "archived"),
            where("barangay", "==", barangayName)
        );
        
        const unsubscribe = onSnapshot(residentQuery, (snapshot) => {
            const residentData = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }));
            setArchivedResidents(residentData);
        });

        return () => unsubscribe();
    }, [barangayName]);

    // Filter residents based on search term
    const filteredResidents = archivedResidents.filter(resident =>
        resident.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        resident.id?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleUnarchive = async (residentId) => {
        const confirm = window.confirm("Are you sure you want to unarchive this resident?");
        if (!confirm) return;

        try {
            const residentRef = doc(db, "residents", residentId);
            const resident = archivedResidents.find(r => r.id === residentId);
            await updateDoc(residentRef, {
                status: "active",
                archiveReason: null,
                archivedAt: null
            });

            // Log the activity
            await logActivity(
                barangayName,
                `Unarchived resident ${resident.fullName} (ID: #${residentId.slice(0, 6).toUpperCase()})`,
                "resident_management"
            );

            alert("Resident unarchived successfully!");
        } catch (error) {
            console.error("Error unarchiving resident:", error);
            alert("Failed to unarchive resident.");
        }
    };

    return (
        <div className="min-h-screen bg-[#99C4E9] flex">
            <Sidebar_brgy 
                isOpen={isSidebarOpen} 
                toggleSidebar={toggleSidebar}
                barangayId={barangayId}
                barangayName={barangayName}
            />

            <div className="flex-1 flex flex-col">
                {/* Header */}
                <header className="bg-white w-full flex items-center justify-between px-3 py-4 shadow-md">
                    <div className="flex items-center space-x-2">
                        <button onClick={toggleSidebar}>
                            <img src="/images/menu.png" alt="Menu" className="w-[35px] h-[30px] cursor-pointer" />
                        </button>
                        <img src="/images/logo.png" alt="Logo" className="w-[40px] h-[40px]" />
                    </div>
                    <h1 className="text-[#1848a0] text-[28px] font-bold drop-shadow-md">ARCHIVED RESIDENTS</h1>
                    <div className="flex items-center space-x-4">
                        <span className="text-black text-[17px] font-semibold">{barangayName}</span>
                        <img src="/images/user.png" alt="Profile" className="w-[40px] h-[40px]" />
                    </div>
                </header>

                {/* Content */}
                <main className="flex-grow px-10 py-6 space-y-6">
                    {/* Search */}
                    <div className="bg-white border border-[#444444] rounded-[15px] p-4 flex justify-end shadow-md">
                        <input
                            type="text"
                            placeholder="Search residents..."
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
                                    <th className="p-3 text-center">Resident ID</th>
                                    <th className="p-3 text-center">Full Name</th>
                                    <th className="p-3 text-center">Archived At</th>
                                    <th className="p-3 text-center">Reason</th>
                                    <th className="p-3 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="text-[#444444] bg-white">
                                {filteredResidents.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="text-center py-6 text-gray-500">
                                            No archived residents found.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredResidents.map((resident) => (
                                        <tr
                                            key={resident.id}
                                            className="border-t hover:bg-gray-100"
                                        >
                                            <td className="p-2 text-center text-blue-600 font-bold">
                                                #{resident.id.slice(0, 6).toUpperCase()}
                                            </td>
                                            <td className="p-3 text-center">{resident.fullName}</td>
                                            <td className="p-3 text-center">
                                                {resident.archivedAt?.toDate ? resident.archivedAt.toDate().toLocaleString() : 'N/A'}
                                            </td>
                                            <td className="p-3 text-center">
                                                {resident.archiveReason || 'N/A'}
                                            </td>
                                            <td className="p-3 text-center">
                                                <button
                                                    className="text-blue-600 hover:underline"
                                                    onClick={() => setSelectedResident(resident)}
                                                >
                                                    View Details
                                                </button>
                                                <button
                                                    className="ml-2 text-green-600 hover:underline"
                                                    onClick={() => handleUnarchive(resident.id)}
                                                >
                                                    Unarchive
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </main>

                {/* Footer */}
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
            {selectedResident && (
                <ResidentDetailsModal
                    resident={selectedResident}
                    onClose={() => setSelectedResident(null)}
                />
            )}
            <PrivacyPolicyModal
                isOpen={isPrivacyPolicyOpen}
                onClose={() => setIsPrivacyPolicyOpen(false)}
            />
        </div>
    );
};

export default ArchivePage_brgy; 