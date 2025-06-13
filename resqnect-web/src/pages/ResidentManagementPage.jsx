import React, { useEffect, useState } from "react";
import Sidebar_brgy from "../components/Sidebar_brgy";
import { useLocation, useNavigate } from "react-router-dom";
import { db } from "../firebase/firebaseConfig";
import { collection, onSnapshot, where, query, updateDoc, doc, deleteDoc, getDoc, getDocs } from "firebase/firestore";
import ResidentDetailsModal from "../components/ResidentDetailModal";
import { getStorage, ref as storageRef, deleteObject } from "firebase/storage";
import PrivacyPolicyModal from "../components/PrivacyPolicyModal";
import ArchiveModal from "../components/ArchiveModal";
import { logActivity } from "../utils/logger";

const ResidentManagementPage = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();

    const [barangayId, setBarangayId] = useState("");
    const [barangayName, setBarangayName] = useState("");

    const [residents, setResidents] = useState([]);
    const [selectedResident, setSelectedResident] = useState(null);
    const [isPrivacyPolicyOpen, setIsPrivacyPolicyOpen] = useState(false);
    const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
    const [selectedResidentForArchive, setSelectedResidentForArchive] = useState(null);

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

    useEffect(() => {
        if (!barangayName) return;

        const q = query(
            collection(db, "residents"),
            where("barangay", "==", barangayName)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const residentData = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }));
            setResidents(residentData);
        });

        return() => unsubscribe();
    }, [barangayName]);
    const confirmResident = async (residentId) => {
        try {
            const residentRef = doc(db, "residents", residentId);
            const resident = residents.find(r => r.id === residentId);
            await updateDoc(residentRef, {status: "approved", approvedAt: new Date()});
            
            // Log the activity
            await logActivity(
                barangayName,
                `Approved resident registration for ${resident.fullName} (ID: #${residentId.slice(0, 6).toUpperCase()})`,
                "resident_management"
            );
            
            alert("Resident confirmed successfully!");
        } catch (error) {
            console.error("Error confirming resident:", error);
            alert("Failed to confirm.");
        }
    };

    const handleArchive = async (residentId, reason) => {
        try {
            console.log('Starting archive process for resident:', residentId);
            
            // First check if resident has any pending or in-progress requests
            const resident = residents.find(r => r.id === residentId);
            const requestsQuery = query(
                collection(db, "assistance_request"),
                where("fullName", "==", resident.fullName),
                where("status", "in", ["Pending", "In Progress"])
            );
            
            const requestsSnapshot = await getDocs(requestsQuery);
            if (!requestsSnapshot.empty) {
                console.log('Cannot archive: Resident has pending requests');
                alert("Cannot archive resident while they have pending or in-progress assistance requests.");
                return;
            }

            console.log('Updating resident status to archived');
            const residentRef = doc(db, "residents", residentId);
            await updateDoc(residentRef, {
                status: "archived",
                archiveReason: reason,
                archivedAt: new Date()
            });

            // Log the activity
            await logActivity(
                barangayName,
                `Archived resident ${resident.fullName} (ID: #${residentId.slice(0, 6).toUpperCase()}) with reason: ${reason}`,
                "resident_management"
            );

            console.log('Resident archived successfully');
            alert("Resident archived successfully!");
        } catch (error) {
            console.error("Error archiving resident:", error);
            alert("Failed to archive resident.");
        }
    };

    const handleUnarchive = async (residentId) => {
        try {
            const resident = residents.find(r => r.id === residentId);
            const residentRef = doc(db, "residents", residentId);
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

    useEffect(() => {
            const handleClickOutside = (event) => {
                const sidebar = document.getElementById("sidebar-brgy");
                if(sidebar && !sidebar.contains(event.target)){
                    setIsSidebarOpen(false);
                }
            };
    
            if(isSidebarOpen) {
                document.addEventListener("mousedown", handleClickOutside);
            } else {
                document.removeEventListener("mousedown", handleClickOutside);
            }
    
            return () => {
                document.removeEventListener("mousedown", handleClickOutside);
            };
        }, [isSidebarOpen]);

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
                    <h1 className="text-[#1848a0] text-[28px] font-bold drop-shadow-md">RESIDENT MANAGEMENT</h1>
                    <div className="flex items-center space-x-4">
                        <span className="text-black text-[17px] font-semibold">{barangayName}</span>
                        <img src="/images/user.png" alt="Profile" className="w-[40px] h-[40px]" />
                    </div>
                </header>

                {/* Content */}
                <main className="flex-grow px-10 py-6 space-y-8">
                    <section>
                        <h2 className="text-[20px] text-[#1E3A5F] font-bold mb-2">Resident Info</h2>
                        <div className="bg-white border border-[#444444] rounded-[15px] overflow-x-auto shadow-md">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="bg-[#1E3A5F] text-white text-left">
                                        <th className="p-3 text-center">Resident ID</th>
                                        <th className="p-3 text-center">Full Name</th>
                                        <th className="p-3 text-center">Full Address</th>
                                        <th className="p-3 text-center">Contact Number</th>
                                        <th className="p-3 text-center">Status</th>
                                        <th className="p-3 text-center">Registered</th>
                                        <th className="p-3 text-center">Approved</th>
                                        <th className="p-3 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="text-[#444444] bg-white">
                                    {residents.map((resident) => (
                                        <tr key={resident.id} className="border-t hover:bg-gray-100 cursor-pointer">
                                            <td className="p-2 text-center text-blue-600 font-bold hover:underline">
                                            #{resident.id.slice(0, 6).toUpperCase()}
                                        </td>
                                            <td className="p-3 text-center">{resident.fullName}</td>
                                            <td className="p-3 text-center">{resident.fullAddress}</td>
                                            <td className="p-3 text-center">{resident.contact}</td>
                                            <td className={`p-3 font-bold text-center ${resident.status === "active" ? "text-green-600" : "text-yellow-600"}`}>
                                                {resident.status.charAt(0).toUpperCase() + resident.status.slice(1)}
                                            </td>
                                            <td className="p-3 text-center">{resident.timestamp?.toDate ? resident.timestamp.toDate().toLocaleString() : 'N/A'}</td>
                                            <td className="p-3 text-center">{resident.approvedAt?.toDate ? resident.approvedAt.toDate().toLocaleString() : '-'}</td>
                                            <td className="p-3 text-center"> 
                                                <button 
                                                    className="text-blue-600 hover:underline"
                                                    onClick={() => setSelectedResident(resident)}
                                                >View Details</button>
                                                {resident.status === "pending" && (
                                                    <button className="ml-2 text-green-600 hover:underline" onClick={() => confirmResident(resident.id)}>Confirm</button>
                                                )}
                                                {resident.status !== "archived" && (
                                                    <button 
                                                        className="ml-2 text-yellow-600 hover:underline" 
                                                        onClick={() => {
                                                            setSelectedResidentForArchive(resident);
                                                            setIsArchiveModalOpen(true);
                                                        }}
                                                    >
                                                        Archive
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
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

            {selectedResident && (
                <ResidentDetailsModal
                    resident={selectedResident}
                    onClose={() => setSelectedResident(null)}
                />
            )}

            {/* Privacy Policy Modal */}
            <PrivacyPolicyModal
                isOpen={isPrivacyPolicyOpen}
                onClose={() => setIsPrivacyPolicyOpen(false)}
            />

            {/* Add ArchiveModal */}
            {selectedResidentForArchive && (
                <ArchiveModal
                    isOpen={isArchiveModalOpen}
                    onClose={() => {
                        setIsArchiveModalOpen(false);
                        setSelectedResidentForArchive(null);
                    }}
                    onArchive={(reason) => handleArchive(selectedResidentForArchive.id, reason)}
                    residentName={selectedResidentForArchive.fullName}
                />
            )}
        </div>
    );
};

export default ResidentManagementPage;