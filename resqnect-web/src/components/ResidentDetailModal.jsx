import React, { useState, useEffect } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import { logActivity } from "../utils/logger";

const ResidentDetailsModal = ({ resident, onClose }) => {
    // State to store form data
    const [formData, setFormData] = useState({ ...resident });
    // State to track if we're in edit mode
    const [isEditing, setIsEditing] = useState(false);
    // State to track if we're saving
    const [isSaving, setIsSaving] = useState(false);

    // Handle input changes
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // Handle save
    const handleSave = async () => {
        setIsSaving(true);
        try {
            const residentRef = doc(db, "residents", resident.id);
            
            // Track changes for logging
            const changes = [];
            if (formData.contact !== resident.contact) changes.push("contact number");
            if (formData.completeAddress !== resident.completeAddress) changes.push("address");
            if (formData.emergencyContactName !== resident.emergencyContactName) changes.push("emergency contact name");
            if (formData.emergencyContactNumber !== resident.emergencyContactNumber) changes.push("emergency contact number");

            await updateDoc(residentRef, {
                contact: formData.contact,
                completeAddress: formData.completeAddress,
                emergencyContactName: formData.emergencyContactName,
                emergencyContactNumber: formData.emergencyContactNumber,
                updatedAt: new Date()
            });

            // Log the activity if there were changes
            if (changes.length > 0) {
                const barangayName = localStorage.getItem('barangayName') || 'Barangay';
                await logActivity(
                    barangayName,
                    `Updated resident ${resident.fullName}'s (ID: #${resident.id.slice(0, 6).toUpperCase()}) information: ${changes.join(", ")}`,
                    "resident_management"
                );
            }

            alert("Resident information updated successfully!");
            setIsEditing(false);
            onClose();
        } catch (error) {
            console.error("Error updating resident:", error);
            alert("Failed to update resident information.");
        }
        setIsSaving(false);
    };

    if (!resident) return null;

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

                <div className="flex justify-center mb-6">
                    <img
                        src={resident.profilePhotoUrl}
                        alt="Profile"
                        className="w-32 h-32 rounded-full object-cover border"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4 text-[#444444]">
                    {/* Read-only fields */}
                    <div>
                        <label className="font-semibold">Full Name</label>
                        <input type="text" value={resident.fullName} readOnly className="border rounded p-2 w-full bg-gray-100" />
                    </div>

                    <div>
                        <label className="font-semibold">Gender</label>
                        <input type="text" value={resident.gender} readOnly className="border rounded p-2 w-full bg-gray-100" />
                    </div>

                    <div>
                        <label className="font-semibold">Date of Birth</label>
                        <input type="text" value={resident.dob} readOnly className="border rounded p-2 w-full bg-gray-100" />
                    </div>

                    <div>
                        <label className="font-semibold">Age</label>
                        <input type="text" value={resident.age} readOnly className="border rounded p-2 w-full bg-gray-100" />
                    </div>

                    {/* Editable fields */}
                    <div>
                        <label className="font-semibold">Contact Number</label>
                        <input 
                            type="text" 
                            name="contact"
                            value={formData.contact} 
                            onChange={handleChange}
                            readOnly={!isEditing}
                            className={`border rounded p-2 w-full ${isEditing ? 'bg-white' : 'bg-gray-100'}`}
                        />
                    </div>

                    <div>
                        <label className="font-semibold">Barangay</label>
                        <input 
                            type="text" 
                            value={resident.barangay} 
                            readOnly 
                            className="border rounded p-2 w-full bg-gray-100"
                        />
                    </div>

                    <div className="col-span-2">
                        <label className="font-semibold">Complete Address</label>
                        <input 
                            type="text" 
                            name="completeAddress"
                            value={formData.completeAddress} 
                            onChange={handleChange}
                            readOnly={!isEditing}
                            className={`border rounded p-2 w-full ${isEditing ? 'bg-white' : 'bg-gray-100'}`}
                        />
                    </div>

                    <div>
                        <label className="font-semibold">Emergency Contact Name</label>
                        <input 
                            type="text" 
                            name="emergencyContactName"
                            value={formData.emergencyContactName} 
                            onChange={handleChange}
                            readOnly={!isEditing}
                            className={`border rounded p-2 w-full ${isEditing ? 'bg-white' : 'bg-gray-100'}`}
                        />
                    </div>

                    <div>
                        <label className="font-semibold">Emergency Contact Number</label>
                        <input 
                            type="text" 
                            name="emergencyContactNumber"
                            value={formData.emergencyContactNumber} 
                            onChange={handleChange}
                            readOnly={!isEditing}
                            className={`border rounded p-2 w-full ${isEditing ? 'bg-white' : 'bg-gray-100'}`}
                        />
                    </div>

                    <div>
                        <label className="font-semibold">Registered At:</label>
                        <input type="text" value={resident.timestamp?.toDate().toLocaleString()} readOnly className="border rounded p-2 w-full bg-gray-100" />
                    </div>

                    <div>
                        <label className="font-semibold">Approved At:</label>
                        <input type="text" value={resident.approvedAt?.toDate ? resident.approvedAt.toDate().toLocaleString() : 'Pending'} readOnly className="border rounded p-2 w-full bg-gray-100" />
                    </div>
                </div>

                {/* Action buttons */}
                <div className="mt-6 flex justify-end gap-3">
                    {!isEditing ? (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2 rounded"
                        >
                            Edit Information
                        </button>
                    ) : (
                        <>
                            <button
                                onClick={() => {
                                    setIsEditing(false);
                                    setFormData({ ...resident });
                                }}
                                className="bg-gray-600 hover:bg-gray-700 text-white font-semibold px-5 py-2 rounded"
                                disabled={isSaving}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                className="bg-green-600 hover:bg-green-700 text-white font-semibold px-5 py-2 rounded"
                                disabled={isSaving}
                            >
                                {isSaving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ResidentDetailsModal;
