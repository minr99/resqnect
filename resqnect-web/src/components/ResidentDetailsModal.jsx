import React, { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import { logActivity } from "../utils/logger";

const ResidentDetailsModal = ({ onClose, resident, onArchive }) => {
    const [archiveReason, setArchiveReason] = useState("");
    const [additionalNotes, setAdditionalNotes] = useState("");

    if (!resident) return null;

    const handleArchive = async () => {
        if (!archiveReason) {
            alert("Please select a reason for archiving.");
            return;
        }

        const confirm = window.confirm(
            "Are you sure you want to archive this resident? " +
            "They will need to re-register through the mobile app to become active again."
        );
        if (!confirm) return;

        try {
            await onArchive(resident, archiveReason, additionalNotes);
            onClose();
        } catch (error) {
            console.error("Archive error:", error);
            alert("Failed to archive resident.");
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

                <h2 className="text-center text-xl font-bold text-[#444444] mb-6">RESIDENT INFORMATION</h2>

                <div className="grid grid-cols-2 gap-4 text-[#444444]">
                    <div>
                        <label className="font-semibold">Full Name</label>
                        <input type="text" value={resident.fullName} readOnly
                            className="border rounded p-2 w-full bg-gray-100" />
                    </div>

                    <div>
                        <label className="font-semibold">Contact Number</label>
                        <input type="text" value={resident.contactNumber} readOnly
                            className="border rounded p-2 w-full bg-gray-100" />
                    </div>

                    <div>
                        <label className="font-semibold">Barangay</label>
                        <input type="text" value={resident.barangay} readOnly
                            className="border rounded p-2 w-full bg-gray-100" />
                    </div>

                    <div>
                        <label className="font-semibold">Address</label>
                        <input type="text" value={resident.address} readOnly
                            className="border rounded p-2 w-full bg-gray-100" />
                    </div>

                    <div>
                        <label className="font-semibold">Registered At</label>
                        <input type="text" value={resident.timestamp?.toDate().toLocaleString()} readOnly
                            className="border rounded p-2 w-full bg-gray-100" />
                    </div>

                    <div>
                        <label className="font-semibold">Status</label>
                        <input type="text" value={resident.status} readOnly
                            className="border rounded p-2 w-full bg-gray-100" />
                    </div>
                </div>

                {resident.status !== "archived" && (
                    <div className="mt-6 border-t pt-4">
                        <h3 className="font-bold text-[#444444] mb-4">Archive Options</h3>
                        
                        <div className="mb-4">
                            <label className="block font-semibold mb-2">Reason for Archiving:</label>
                            <select
                                value={archiveReason}
                                onChange={(e) => setArchiveReason(e.target.value)}
                                className="border rounded p-2 w-full"
                            >
                                <option value="">Select a reason</option>
                                <option value="Moved to another barangay">Moved to another barangay</option>
                                <option value="Deceased">Deceased</option>
                                <option value="Requested removal">Requested removal</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>

                        <div className="mb-4">
                            <label className="block font-semibold mb-2">Additional Notes:</label>
                            <textarea
                                value={additionalNotes}
                                onChange={(e) => setAdditionalNotes(e.target.value)}
                                className="border rounded p-2 w-full"
                            />
                        </div>
                    </div>
                )}

                <div className="mt-6 flex justify-end gap-3">
                    {resident.status !== "archived" && (
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

export default ResidentDetailsModal; 