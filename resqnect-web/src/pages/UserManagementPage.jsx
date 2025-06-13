import React, { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import { db } from "../firebase/firebaseConfig";
import { collection, onSnapshot, doc, updateDoc, deleteDoc, getDocs, getDoc, query, where } from "firebase/firestore";
import BarangayDetailsModal from "../components/BarangayDetailsModal";
import ResidentDetailsModal from "../components/ResidentDetailModal";
import { getStorage, ref, deleteObject } from "firebase/storage";
import PrivacyPolicyModal from "../components/PrivacyPolicyModal";
import { logActivity } from "../utils/logger";

const UserManagementPage = () => {
    // State for sidebar toggle
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    
    // State for storing data
    const [barangays, setBarangays] = useState([]);
    const [residents, setResidents] = useState([]);
    
    // State for modals
    const [selectedBarangay, setSelectedBarangay] = useState(null);
    const [selectedResident, setSelectedResident] = useState(null);
    
    // State for filters
    const [residentSearch, setResidentSearch] = useState("");
    const [residentStatusFilter, setResidentStatusFilter] = useState("all");

    // State for Privacy Policy modal
    const [isPrivacyPolicyOpen, setIsPrivacyPolicyOpen] = useState(false);

    // State for active tab
    const [activeTab, setActiveTab] = useState("barangays");

    // State for multi-select and migration
    const [selectedResidents, setSelectedResidents] = useState([]);
    const [showMigrationModal, setShowMigrationModal] = useState(false);
    const [selectedTargetBarangay, setSelectedTargetBarangay] = useState("");
    const [migrationReason, setMigrationReason] = useState("");

    // Toggle sidebar function
    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    // Modal handlers
    const openBarangayModal = (barangay) => {
        setSelectedBarangay(barangay);
    };

    const closeBarangayModal = () => {
        setSelectedBarangay(null);
    };

    const openResidentModal = (resident) => {
        setSelectedResident(resident);
    };

    const closeResidentModal = () => {
        setSelectedResident(null);
    };

    // Set up real-time listeners for both barangays and residents
    useEffect(() => {
        // Real-time listener for barangays
        const barangayUnsubscribe = onSnapshot(
            collection(db, "barangays"),
            (snapshot) => {
                const barangayData = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                }));
                setBarangays(barangayData);
            },
            (error) => {
                console.error("Error fetching barangays:", error);
            }
        );

        // Real-time listener for residents
        const residentUnsubscribe = onSnapshot(
            collection(db, "residents"),
            (snapshot) => {
                const residentData = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                }));
                setResidents(residentData);
            },
            (error) => {
                console.error("Error fetching residents:", error);
            }
        );

        // Cleanup function to remove listeners when component unmounts
        return () => {
            barangayUnsubscribe();
            residentUnsubscribe();
        };
    }, []); // Empty dependency array means this effect runs once on mount

    // Filter residents based on search and status
    const filteredResidents = residents.filter((res) => {
        const matchesSearch =
            res.fullName?.toLowerCase().includes(residentSearch.toLowerCase());
        const matchesStatus =
            residentStatusFilter === "all" || res.status === residentStatusFilter;
        // Exclude archived residents
        return matchesSearch && matchesStatus && res.status !== "archived";
    });

    // Filter barangays to exclude archived ones
    const filteredBarangays = barangays.filter(brgy => brgy.status !== "archived");

    useEffect(() => {
        const handleClickOutside = (event) => {
            const sidebar = document.getElementById("sidebar");
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

    // Handle barangay confirmation
    const handleBarangayConfirm = async (barangay) => {
        try {
            const barangayRef = doc(db, "barangays", barangay.id);
            await updateDoc(barangayRef, { 
                status: "active",
                approvedAt: new Date()
            });

            // Log the activity
            const adminName = localStorage.getItem('adminName') || 'Admin';
            await logActivity(
                adminName,
                `Confirmed barangay: ${barangay.barangayName}`,
                'user_management'
            );

            alert("Barangay confirmed!");
        } catch (error) {
            console.error("Confirm error:", error);
            alert("Failed to confirm barangay.");
        }
    };

    // Handle barangay archive
    const handleArchiveBarangay = async (barangay, reason, additionalNotes, targetBarangayId) => {
        try {
            const barangayRef = doc(db, "barangays", barangay.id);
            
            // Check for pending requests
            const requestsQuery = query(
                collection(db, "assistance_request"),
                where("barangay", "==", barangay.barangayName)
            );
            const requestsSnapshot = await getDocs(requestsQuery);
            const pendingRequests = requestsSnapshot.docs.filter(
                doc => {
                    const data = doc.data();
                    return data.status === "Pending" || 
                           data.status === "In Progress" || 
                           (data.status === "Forwarded to CDRRMO" && data.adminStatus === "Pending");
                }
            );

            if (pendingRequests.length > 0) {
                alert("Cannot archive barangay. There are pending or in-progress requests that need to be completed first.");
                return;
            }

            // If there's a target barangay for migration, update residents
            if (targetBarangayId) {
                const targetBarangayRef = doc(db, "barangays", targetBarangayId);
                const targetBarangaySnap = await getDoc(targetBarangayRef);
                const targetBarangayData = targetBarangaySnap.data();

                // Update all residents from this barangay
                const residentsSnapshot = await getDocs(
                    query(collection(db, "residents"), where("barangay", "==", barangay.barangayName))
                );

                for (const residentDoc of residentsSnapshot.docs) {
                    const residentRef = doc(db, "residents", residentDoc.id);
                    await updateDoc(residentRef, {
                        barangay: targetBarangayData.barangayName,
                        fullAddress: `${residentDoc.data().completeAddress}, ${targetBarangayData.barangayName}`,
                        updatedAt: new Date(),
                        migrationReason: reason,
                        migratedAt: new Date(),
                        migratedBy: localStorage.getItem('adminName') || 'Admin'
                    });
                }
            }

            // Update barangay status
            await updateDoc(barangayRef, {
                status: "archived",
                archiveReason: reason,
                archiveNotes: additionalNotes,
                archivedAt: new Date()
            });

            // Log the activity
            const adminName = localStorage.getItem('adminName') || 'Admin';
            await logActivity(
                adminName,
                `Archived barangay: ${barangay.barangayName} - Reason: ${reason}`,
                'user_management'
            );

            alert("Barangay archived successfully!");
        } catch (error) {
            console.error("Archive error:", error);
            alert("Failed to archive barangay.");
        }
    };

    // Handle resident selection
    const handleResidentSelect = (residentId) => {
        setSelectedResidents(prev => {
            if (prev.includes(residentId)) {
                return prev.filter(id => id !== residentId);
            } else {
                return [...prev, residentId];
            }
        });
    };

    // Handle resident migration
    const handleResidentMigration = async () => {
        if (!selectedTargetBarangay || !migrationReason) {
            alert("Please select a target barangay and provide a reason for migration.");
            return;
        }

        try {
            // Get the target barangay details
            const targetBarangayRef = doc(db, "barangays", selectedTargetBarangay);
            const targetBarangaySnap = await getDoc(targetBarangayRef);
            const targetBarangayData = targetBarangaySnap.data();

            // Check for pending requests for all selected residents
            for (const residentId of selectedResidents) {
                const resident = residents.find(r => r.id === residentId);
                if (!resident) continue;

                const requestsQuery = query(
                    collection(db, "assistance_request"),
                    where("fullName", "==", resident.fullName),
                    where("status", "in", ["Pending", "In Progress"])
                );
                
                const requestsSnapshot = await getDocs(requestsQuery);
                if (!requestsSnapshot.empty) {
                    alert(`Cannot migrate resident ${resident.fullName}. They have pending or in-progress assistance requests.`);
                    return;
                }
            }

            const confirm = window.confirm(
                `Are you sure you want to migrate ${selectedResidents.length} resident(s) to ${targetBarangayData.barangayName}?`
            );
            if (!confirm) return;

            // Update each selected resident
            for (const residentId of selectedResidents) {
                const residentRef = doc(db, "residents", residentId);
                const residentSnap = await getDoc(residentRef);
                const residentData = residentSnap.data();

                await updateDoc(residentRef, {
                    barangay: targetBarangayData.barangayName,
                    previousBarangay: residentData.barangay,
                    migratedAt: new Date(),
                    migrationReason: migrationReason,
                    migratedBy: localStorage.getItem('adminName') || 'Admin'
                });
            }

            // Log the activity
            const adminName = localStorage.getItem('adminName') || 'Admin';
            await logActivity(
                adminName,
                `Migrated ${selectedResidents.length} resident(s) to ${targetBarangayData.barangayName} - Reason: ${migrationReason}`,
                'user_management'
            );

            alert("Residents have been migrated successfully.");
            setShowMigrationModal(false);
            setSelectedResidents([]);
            setSelectedTargetBarangay("");
            setMigrationReason("");
        } catch (error) {
            console.error("Migration error:", error);
            alert("Failed to migrate residents.");
        }
    };

    return (
        <div className="min-h-screen bg-[#99C4E9] flex">
            {/* Dark overlay when any modal is open */}
            {(isPrivacyPolicyOpen || showMigrationModal) && (
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
                        USER MANAGEMENT
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
                <main className="flex-grow px-10 py-6 space-y-12">
                    {/* Barangay Section */}
                    <section>
                        <h2 className="text-[20px] text-[#1E3A5F] font-bold mb-2">
                            Barangay Accounts
                        </h2>
                        <div className="bg-white border border-[#444444] rounded-[15px] overflow-x-auto shadow-md">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="bg-[#1E3A5F] text-white text-left">
                                        <th className="p-3 text-center">Barangay ID</th>
                                        <th className="p-3 text-center">Barangay Name</th>
                                        <th className="p-3 text-center">Captain Name</th>
                                        <th className="p-3 text-center">Contact</th>
                                        <th className="p-3 text-center">Status</th>
                                        <th className="p-3 text-center">Registered</th>
                                        <th className="p-3 text-center">Approved</th>
                                        <th className="p-3 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="text-[#444444] bg-white">
                                    {filteredBarangays.map((brgy) => (
                                        <tr
                                            key={brgy.id}
                                            className="border-t hover:bg-gray-100"
                                        >
                                            <td className="p-2 text-center text-blue-600 font-bold hover:underline">
                                                #{brgy.id.slice(0, 6).toUpperCase()}
                                            </td>
                                            <td className="p-3 text-center">{brgy.barangayName}</td>
                                            <td className="p-3 text-center">{brgy.captainName}</td>
                                            <td className="p-3 text-center">{brgy.barangayContact}</td>
                                            <td
                                                className={`p-3 font-bold text-center ${
                                                    brgy.status === "active"
                                                        ? "text-green-600"
                                                        : "text-yellow-600"
                                                }`}
                                            >
                                                {brgy.status.charAt(0).toUpperCase() +
                                                    brgy.status.slice(1)}
                                            </td>
                                            <td className="p-3 text-center">{brgy.timestamp?.toDate ? brgy.timestamp.toDate().toLocaleString() : 'N/A'}</td>
                                            <td className="p-3 text-center">{brgy.approvedAt?.toDate ? brgy.approvedAt.toDate().toLocaleString() : '-'}</td>
                                            <td className="p-3 text-center">
                                                <button
                                                    className="text-blue-600 hover:underline"
                                                    onClick={() => openBarangayModal(brgy)}
                                                >
                                                    View Details
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    {/* Residents Section */}
                    <section>
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-[20px] text-[#1E3A5F] font-bold">
                                Residents Information
                            </h2>
                            {selectedResidents.length > 0 && (
                                <button
                                    onClick={() => setShowMigrationModal(true)}
                                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded"
                                >
                                    Migrate Selected ({selectedResidents.length})
                                </button>
                            )}
                        </div>

                        <div className="flex justify-between mb-4 gap-4">
                            <input
                                type="text"
                                placeholder="Search by name"
                                value={residentSearch}
                                onChange={(e) => setResidentSearch(e.target.value)}
                                className="border p-2 rounded w-full max-w-xs"
                            />
                            <select
                                value={residentStatusFilter}
                                onChange={(e) => setResidentStatusFilter(e.target.value)}
                                className="border p-2 rounded w-full max-w-xs"
                            >
                                <option value="all">All Status</option>
                                <option value="pending">Pending</option>
                                <option value="active">Active</option>
                            </select>
                        </div>

                        <div className="bg-white border border-[#444444] rounded-[15px] overflow-x-auto shadow-md">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="bg-[#1E3A5F] text-white text-left">
                                        <th className="p-3 text-center">
                                            <input
                                                type="checkbox"
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setSelectedResidents(filteredResidents.map(r => r.id));
                                                    } else {
                                                        setSelectedResidents([]);
                                                    }
                                                }}
                                                checked={selectedResidents.length === filteredResidents.length}
                                            />
                                        </th>
                                        <th className="p-3 text-center">Resident ID</th>
                                        <th className="p-3 text-center">Full Name</th>
                                        <th className="p-3 text-center">Barangay</th>
                                        <th className="p-3 text-center">Contact</th>
                                        <th className="p-3 text-center">Status</th>
                                        <th className="p-3 text-center">Registered</th>
                                        <th className="p-3 text-center">Approved</th>
                                        <th className="p-3 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="text-[#444444] bg-white">
                                    {filteredResidents.map((res) => (
                                        <tr
                                            key={res.id}
                                            className="border-t hover:bg-gray-100"
                                        >
                                            <td className="p-3 text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedResidents.includes(res.id)}
                                                    onChange={() => handleResidentSelect(res.id)}
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                            </td>
                                            <td className="p-2 text-center text-blue-600 font-bold hover:underline">
                                                #{res.id.slice(0, 6).toUpperCase()}
                                            </td>
                                            <td className="p-3 text-center">{res.fullName}</td>
                                            <td className="p-3 text-center">{res.barangay}</td>
                                            <td className="p-3 text-center">{res.contact}</td>
                                            <td
                                                className={`p-3 font-bold text-center ${
                                                    res.status === "active"
                                                        ? "text-green-600"
                                                        : "text-yellow-600"
                                                }`}
                                            >
                                                {res.status.charAt(0).toUpperCase() +
                                                    res.status.slice(1)}
                                            </td>
                                            <td className="p-3 text-center">{res.timestamp?.toDate ? res.timestamp.toDate().toLocaleString() : 'N/A'}</td>
                                            <td className="p-3 text-center">{res.approvedAt?.toDate ? res.approvedAt.toDate().toLocaleString() : '-'}</td>
                                            <td className="p-3 text-center">
                                                <button
                                                    className="text-blue-600 hover:underline"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        openResidentModal(res);
                                                    }}
                                                >
                                                    View Details
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
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

                {/* Modals */}
                {selectedBarangay && (
                    <BarangayDetailsModal
                        barangay={selectedBarangay}
                        onClose={closeBarangayModal}
                        onConfirm={handleBarangayConfirm}
                        onArchive={handleArchiveBarangay}
                    />
                )}
                {selectedResident && (
                    <ResidentDetailsModal
                        resident={selectedResident}
                        onClose={closeResidentModal}
                    />
                )}

                {/* Migration Modal */}
                {showMigrationModal && (
                    <div className="fixed inset-0 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg p-6 w-[500px]">
                            <h3 className="text-lg font-bold mb-4">Migrate Residents</h3>
                            
                            <div className="mb-4">
                                <label className="block font-semibold mb-2">Select Target Barangay:</label>
                                <select
                                    value={selectedTargetBarangay}
                                    onChange={(e) => setSelectedTargetBarangay(e.target.value)}
                                    className="border rounded p-2 w-full"
                                >
                                    <option value="">Select a barangay</option>
                                    {filteredBarangays
                                        .filter(brgy => !selectedResidents.some(id => 
                                            residents.find(r => r.id === id)?.barangay === brgy.barangayName
                                        ))
                                        .map((brgy) => (
                                            <option key={brgy.id} value={brgy.id}>
                                                {brgy.barangayName}
                                            </option>
                                        ))}
                                </select>
                            </div>

                            <div className="mb-4">
                                <label className="block font-semibold mb-2">Reason for Migration:</label>
                                <textarea
                                    value={migrationReason}
                                    onChange={(e) => setMigrationReason(e.target.value)}
                                    className="border rounded p-2 w-full h-24"
                                    placeholder="Enter reason for migration..."
                                />
                            </div>

                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => {
                                        setShowMigrationModal(false);
                                        setSelectedTargetBarangay("");
                                        setMigrationReason("");
                                    }}
                                    className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleResidentMigration}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
                                >
                                    Migrate
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Privacy Policy Modal */}
                <PrivacyPolicyModal
                    isOpen={isPrivacyPolicyOpen}
                    onClose={() => setIsPrivacyPolicyOpen(false)}
                />
            </div>
        </div>
    );
};

export default UserManagementPage;
