import React, { useState, useEffect } from "react";
import AssignTeamModal from "./AssignTeamModal";
import { collection, doc, getDocs, query, updateDoc, where } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import { logActivity } from "../utils/logger";

const RequestAssistanceModal = ({ isOpen, onClose, requestData }) => {
    // State for modals
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    
    // State for notes
    const [notes, setNotes] = useState("");
    
    // Get admin name from localStorage
    const adminName = localStorage.getItem('adminName') || 'Admin';

    // Update notes when requestData changes
    useEffect(() => {
        if (requestData) {
            setNotes(requestData.notes || "");
        }
    }, [requestData]);

    if (!isOpen || !requestData) return null;

    // Function to handle marking request as completed
    const handleMarkAsCompleted = async () => {
        try {
            const requestRef = doc(db, "assistance_request", requestData.id);
            await updateDoc(requestRef, {
                adminStatus: "Completed",
                notes: notes // Save notes when marking as completed
            });

            // Log the activity
            await logActivity(
                adminName,
                `Marked request #${requestData.id.slice(0, 6).toUpperCase()} as completed`,
                "assistance_management"
            );

            if(requestData.assignedTeam) {
                const teamsQuery = query(collection(db, "rescue_teams"), where("teamName", "==", requestData.assignedTeam));
                const teamsSnapshot = await getDocs(teamsQuery);

                if(!teamsSnapshot.empty) {
                    const teamDoc = teamsSnapshot.docs[0].ref;
                    await updateDoc(teamDoc, {
                        status: "Standby",
                        requestID: ""
                    });

                    // Log team status change
                    await logActivity(
                        adminName,
                        `Updated team ${requestData.assignedTeam} status to Standby after completing request #${requestData.id.slice(0, 6).toUpperCase()}`,
                        "assistance_management"
                    );
                }
            }
            onClose();
        } catch (error) {
            console.error("Failed to mark as completed:", error);
        }
    }

    // Function to handle notes changes
    const handleNotesChange = async (e) => {
        const newNotes = e.target.value;
        setNotes(newNotes);
        
        // Update notes in real-time
        try {
            const requestRef = doc(db, "assistance_request", requestData.id);
            await updateDoc(requestRef, { notes: newNotes });
            
            // Log notes update
            await logActivity(
                adminName,
                `Updated notes for request #${requestData.id.slice(0, 6).toUpperCase()}`,
                "assistance_management"
            );
        } catch (error) {
            console.error("Failed to update notes:", error);
        }
    }

    // Function to determine if Complete button should be enabled
    const isCompleteButtonEnabled = () => {
        return requestData.assignedTeam && requestData.adminStatus !== "Completed";
    };

    return (
        <>
            <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
                <div className="bg-white w-[740px] h-auto border border-[#444444] rounded-[20px] shadow-lg p-6 relative pointer-events-auto">
                    {/* Close button */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-6 text-2xl text-[#444444] hover:text-black cursor-pointer"
                    >
                        &times;
                    </button>

                    {/* Title */}
                    <h2 className="text-center text-xl font-bold text-[#444444] tracking-wide mb-6">
                        RESIDENT INFORMATION - ASSISTANCE REQUEST
                    </h2>

                    {/* Resident Info Section */}
                    <div className="flex items-center gap-6 border-b pb-4">
                        <img
                            src={requestData.profilePicUrl || "/images/user.png"}
                            alt="Profile"
                            className="w-24 h-24 rounded-full border object-cover"
                        />
                        <div className="text-[#444444] flex-1">
                            <div className="grid grid-cols-2 gap-x-8">
                                <div>
                                    <p><strong>Name:</strong> {requestData.fullName || "N/A"}</p>
                                    <p><strong>Age:</strong> {requestData.age || "N/A"}</p>
                                    <p><strong>Gender:</strong> {requestData.gender || "N/A"}</p>
                                    <p><strong>Contact:</strong> {requestData.contact || "N/A"}</p>
                                </div>
                                <div>
                                    <p><strong>Emergency Contact:</strong> {requestData.emergencyContactName || "N/A"}</p>
                                    <p><strong>Emergency Number:</strong> {requestData.emergencyContactNumber || "N/A"}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Request Details Section */}
                    <div className="mt-4 text-[#444444]">
                        <p className="pb-2"><strong>Request Type:</strong> {requestData.assistanceType || "N/A"}</p>
                        <p className="pb-2"><strong>Priority:</strong> <span className={`ml-1 font-bold ${requestData.priority === "High" ? "text-red-600" : requestData.priority === "Medium" ? "text-yellow-600" : requestData.priority === "Low" ? "text-green-600" : "text-gray-500"}`}>{requestData.priority || "N/A"}</span></p>
                        <p className="pb-2"><strong>Status:</strong> {requestData.adminStatus}</p>
                        <p className="pb-2"><strong>Date & Time:</strong> {requestData.timestamp.toDate().toLocaleString()}</p>
                        <p className="pb-2"><strong>Assigned Team:</strong> {requestData.assignedTeam || "No Assigned Team"}</p>
                    </div>

                    {/* Location Section */}
                    <div className="mt-4">
                        <p className="font-bold text-[#444444]">Location of Incident:</p>
                        <div className="border rounded-lg p-2 mt-2 text-[#444444] bg-gray-100">
                            {requestData.address || "N/A"}
                        </div>
                    </div>

                    {/* Notes Section */}
                    <div className="mt-4">
                        <label className="font-bold text-[#444444]">Notes:</label>
                        <textarea
                            className="w-full border p-2 mt-1 rounded"
                            rows="3"
                            placeholder="Enter notes here..."
                            value={notes}
                            onChange={handleNotesChange}
                        ></textarea>
                        <p className="text-sm text-gray-500 mt-1">
                            Use this space to record important details about this specific request, such as special circumstances, follow-up actions, or any other relevant information.
                        </p>
                    </div>

                    {/* Action Buttons Section */}
                    <div className="mt-6 flex justify-end">
                        <div className="flex gap-10">
                            {requestData.adminStatus !== "Completed" && (
                                <button 
                                    onClick={() => setIsAssignModalOpen(true)} 
                                    className="border-2 hover:bg-gray-200 px-9 py-2 rounded-lg"
                                >
                                    Assign a Team
                                </button>
                            )}
                            {requestData.adminStatus === "Completed" ? (
                                <button 
                                    onClick={onClose} 
                                    className="bg-[#1848A0] text-white px-9 py-2 rounded-lg"
                                >
                                    Close
                                </button>
                            ) : (
                                <button 
                                    onClick={() => setIsConfirmModalOpen(true)}
                                    className={`px-5 py-2 rounded-lg ${
                                        isCompleteButtonEnabled() 
                                            ? 'bg-[#1848A0] text-white cursor-pointer' 
                                            : 'bg-gray-400 text-white cursor-not-allowed'
                                    }`}
                                    disabled={!isCompleteButtonEnabled()}
                                >
                                    Completed
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Assign Team Modal */}
            <AssignTeamModal
                isOpen={isAssignModalOpen}
                onClose={() => setIsAssignModalOpen(false)}
                requestData={requestData}
            />

            {/* Confirmation Modal for Mark as Completed */}
            {isConfirmModalOpen && (
                <div className="fixed inset-0 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
                        <h3 className="text-xl font-bold mb-4">Confirm Action</h3>
                        <p className="mb-6">Are you sure you want to mark this request as completed?</p>
                        <div className="flex justify-end gap-4">
                            <button
                                onClick={() => setIsConfirmModalOpen(false)}
                                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    setIsConfirmModalOpen(false);
                                    handleMarkAsCompleted();
                                }}
                                className="px-4 py-2 bg-[#1848A0] text-white rounded hover:bg-[#153d8a]"
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default RequestAssistanceModal;
