import React, { useState, useEffect } from "react";
import { doc, updateDoc, collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import { logActivity } from "../utils/logger";

const BarangayDetailsModal = ({ onClose, barangay, onConfirm, onArchive, onUnarchive }) => {
    const [formData, setFormData] = useState({ ...barangay });
    const [activeBarangays, setActiveBarangays] = useState([]);
    const [selectedMergeBarangay, setSelectedMergeBarangay] = useState("");
    const [archiveReason, setArchiveReason] = useState("");
    const [showMergeOptions, setShowMergeOptions] = useState(false);
    const [additionalNotes, setAdditionalNotes] = useState("");
    const [isEditing, setIsEditing] = useState(false);

    // Fetch active barangays for merge options
    useEffect(() => {
        const fetchActiveBarangays = async () => {
            const q = query(
                collection(db, "barangays"),
                where("status", "==", "active")
            );
            const snapshot = await getDocs(q);
            const barangays = snapshot.docs
                .map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }))
                .filter(brgy => brgy.id !== barangay.id); // Exclude current barangay
            setActiveBarangays(barangays);
        };
        fetchActiveBarangays();
    }, [barangay.id]);

    if (!barangay) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        try {
            const barangayRef = doc(db, "barangays", barangay.id);
            const changes = {
                barangayName: formData.barangayName,
                captainName: formData.captainName,
                barangayContact: formData.barangayContact,
                username: formData.username,
                teamContact: formData.teamContact,
                teamContactNumber: formData.teamContactNumber,
            };

            // Log the changes
            const adminName = localStorage.getItem('adminName') || 'Admin';
            const changesList = Object.entries(changes)
                .filter(([key, value]) => value !== barangay[key])
                .map(([key, value]) => `${key}: ${barangay[key]} → ${value}`)
                .join(', ');

            if (changesList) {
                await logActivity(
                    adminName,
                    `Updated barangay information for ${barangay.barangayName}: ${changesList}`,
                    'user_management'
                );
            }

            await updateDoc(barangayRef, changes);
            alert("Barangay data updated!");
            setIsEditing(false);
            onClose();
        } catch (error) {
            console.error("Update error:", error);
            alert("Failed to update.");
        }
    };

    const handleConfirm = async () => {
        try {
            await onConfirm(barangay);
            onClose();
        } catch (error) {
            console.error("Confirm error:", error);
            alert("Failed to confirm.");
        }
    };

    const handleArchive = async () => {
        if (!archiveReason) {
            alert("Please select a reason for archiving.");
            return;
        }

        // If the reason is "Merged with another barangay" or "Barangay dissolved", require new barangay selection
        if ((archiveReason === "Merged with another barangay" || archiveReason === "Barangay dissolved") && !selectedMergeBarangay) {
            alert("Please select a barangay to migrate residents to.");
            return;
        }

        const confirmMessage = archiveReason === "Merged with another barangay" 
            ? "Are you sure you want to archive this barangay and migrate all residents to the selected barangay?"
            : archiveReason === "Barangay dissolved"
            ? "Are you sure you want to archive this barangay and migrate all residents to the selected barangay?"
            : "Are you sure you want to archive this barangay? They will need to re-register through the mobile app to become active again.";

        const confirm = window.confirm(confirmMessage);
        if (!confirm) return;

        try {
            await onArchive(barangay, archiveReason, additionalNotes, selectedMergeBarangay);
            onClose();
        } catch (error) {
            console.error("Archive error:", error);
            alert("Failed to archive barangay.");
        }
    };

    const handleUnarchive = async () => {
        const confirm = window.confirm(
            "Are you sure you want to unarchive this barangay? " +
            "They will be able to log in again and access their account."
        );
        if (!confirm) return;

        try {
            await onUnarchive(barangay);
            onClose();
        } catch (error) {
            console.error("Unarchive error:", error);
            alert("Failed to unarchive barangay.");
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="bg-white w-[700px] rounded-[20px] shadow-lg p-6 relative max-h-[90vh] overflow-y-auto">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-6 text-2xl text-gray-600 hover:text-black"
                >
                    &times;
                </button>

                <h2 className="text-center text-xl font-bold text-[#444444] mb-6">BARANGAY INFORMATION</h2>

                <div className="grid grid-cols-2 gap-4 text-[#444444]">
                    <div>
                        <label className="font-semibold">Barangay Name</label>
                        <input 
                            type="text" 
                            name="barangayName" 
                            value={formData.barangayName} 
                            onChange={handleChange}
                            readOnly={!isEditing}
                            className={`border rounded p-2 w-full ${isEditing ? '' : 'bg-gray-100'}`}
                        />
                    </div>

                    <div>
                        <label className="font-semibold">Captain Name</label>
                        <input 
                            type="text" 
                            name="captainName" 
                            value={formData.captainName} 
                            onChange={handleChange}
                            readOnly={!isEditing}
                            className={`border rounded p-2 w-full ${isEditing ? '' : 'bg-gray-100'}`}
                        />
                    </div>

                    <div>
                        <label className="font-semibold">Barangay Contact</label>
                        <input 
                            type="text" 
                            name="barangayContact" 
                            value={formData.barangayContact} 
                            onChange={handleChange}
                            readOnly={!isEditing}
                            className={`border rounded p-2 w-full ${isEditing ? '' : 'bg-gray-100'}`}
                        />
                    </div>

                    <div>
                        <label className="font-semibold">Username</label>
                        <input 
                            type="text" 
                            name="username" 
                            value={formData.username} 
                            onChange={handleChange}
                            readOnly={!isEditing}
                            className={`border rounded p-2 w-full ${isEditing ? '' : 'bg-gray-100'}`}
                        />
                    </div>

                    <div>
                        <label className="font-semibold">Team Contact Person</label>
                        <input 
                            type="text" 
                            name="teamContact" 
                            value={formData.teamContact} 
                            onChange={handleChange}
                            readOnly={!isEditing}
                            className={`border rounded p-2 w-full ${isEditing ? '' : 'bg-gray-100'}`}
                        />
                    </div>

                    <div>
                        <label className="font-semibold">Team Contact Number</label>
                        <input 
                            type="text" 
                            name="teamContactNumber" 
                            value={formData.teamContactNumber} 
                            onChange={handleChange}
                            readOnly={!isEditing}
                            className={`border rounded p-2 w-full ${isEditing ? '' : 'bg-gray-100'}`}
                        />
                    </div>

                    <div>
                        <label className="font-semibold">Registered At:</label>
                        <input type="text" value={formData.timestamp?.toDate().toLocaleString()} readOnly
                            className="border rounded p-2 w-full bg-gray-100" />
                    </div>

                    <div>
                        <label className="font-semibold">Approved At:</label>
                        <input type="text" value={formData.approvedAt?.toDate ? formData.approvedAt.toDate().toLocaleString() : '-'} readOnly
                            className="border rounded p-2 w-full bg-gray-100" />
                    </div>
                </div>

                <div className="mt-6">
                    <label className="font-semibold text-[#444444]">Proof of Legitimacy</label>
                    <div className="mt-2">
                        <img src={formData.proofURL} alt="Proof" className="w-full max-h-[300px] object-contain border rounded" />
                    </div>
                </div>

                {barangay.status !== "archived" && (
                    <div className="mt-6 border-t pt-4">
                        <h3 className="font-bold text-[#444444] mb-4">Archive Options</h3>
                        
                        <div className="mb-4">
                            <label className="block font-semibold mb-2">Reason for Archiving:</label>
                            <select
                                value={archiveReason}
                                onChange={(e) => {
                                    setArchiveReason(e.target.value);
                                    setShowMergeOptions(
                                        e.target.value === "Merged with another barangay" || 
                                        e.target.value === "Barangay dissolved"
                                    );
                                }}
                                className="border rounded p-2 w-full"
                            >
                                <option value="">Select a reason</option>
                                <option value="Merged with another barangay">Merged with another barangay</option>
                                <option value="Barangay dissolved">Barangay dissolved</option>
                            </select>
                        </div>

                        {showMergeOptions && (
                            <div className="mb-4">
                                <label className="block font-semibold mb-2">
                                    {archiveReason === "Merged with another barangay" 
                                        ? "Select Barangay to Merge With:"
                                        : "Select Barangay to Migrate Residents To:"}
                                </label>
                                <select
                                    value={selectedMergeBarangay}
                                    onChange={(e) => setSelectedMergeBarangay(e.target.value)}
                                    className="border rounded p-2 w-full"
                                >
                                    <option value="">Select a barangay</option>
                                    {activeBarangays.map((brgy) => (
                                        <option key={brgy.id} value={brgy.id}>
                                            {brgy.barangayName}
                                        </option>
                                    ))}
                                </select>
                                <p className="text-sm text-gray-600 mt-2">
                                    {archiveReason === "Merged with another barangay"
                                        ? "All residents will be migrated to the selected barangay."
                                        : "All residents will be migrated to the selected barangay."}
                                </p>
                            </div>
                        )}

                        <div className="mb-4">
                            <label className="block font-semibold mb-2">Additional Notes:</label>
                            <textarea
                                value={additionalNotes}
                                onChange={(e) => setAdditionalNotes(e.target.value)}
                                className="border rounded p-2 w-full"
                                placeholder="Add any additional information about the archiving process..."
                            />
                        </div>
                    </div>
                )}

                <div className="mt-6 flex justify-between gap-3">
                    {!isEditing ? (
                        <>
                            {barangay.status === "archived" ? (
                                <button
                                    onClick={handleUnarchive}
                                    className="bg-green-600 hover:bg-green-700 text-white font-semibold px-5 py-2 rounded"
                                >
                                    Unarchive Barangay
                                </button>
                            ) : (
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2 rounded"
                                >
                                    Edit Information
                                </button>
                            )}
                        </>
                    ) : (
                        <>
                            <button
                                onClick={() => {
                                    setIsEditing(false);
                                    setFormData({ ...barangay });
                                }}
                                className="bg-gray-600 hover:bg-gray-700 text-white font-semibold px-5 py-2 rounded"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                className="bg-green-600 hover:bg-green-700 text-white font-semibold px-5 py-2 rounded"
                            >
                                Save Changes
                            </button>
                        </>
                    )}

                    {formData.status === "pending" && (
                        <button
                            onClick={handleConfirm}
                            className="bg-green-600 hover:bg-green-700 text-white font-semibold px-5 py-2 rounded"
                        >
                            Confirm
                        </button>
                    )}

                    {barangay.status !== "archived" && (
                        <button
                            onClick={handleArchive}
                            className="bg-yellow-600 hover:bg-yellow-700 text-white font-semibold px-5 py-2 rounded"
                        >
                            Archive
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BarangayDetailsModal;
