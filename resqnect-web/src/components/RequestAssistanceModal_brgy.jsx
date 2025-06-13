import React, {useState} from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import ForwardRescue from "./ForwardRescue";
import { logActivity } from "../utils/logger";

const RequestAssistanceModal_brgy = ({ isOpen, onClose, requestData}) => {
    // State for notes input
    const [notes, setNotes] = useState("");
    
    // State for forward modal
    const [isForwardModalOpen, setIsForwardModalOpen] = useState(false);
    
    // State for confirmation modal
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    
    // Get barangay name from localStorage
    const barangayName = localStorage.getItem('barangayName') || 'Barangay';

    if(!isOpen || !requestData) return null;

    // Function to handle marking request as handled
    const handleMarkasHandled = async () => {
        try {
            const requestRef = doc(db, "assistance_request", requestData.id);
            await updateDoc(requestRef, {
                status: "Handled",
                notes: notes || "",
            });

            // Log the activity
            await logActivity(
                barangayName,
                `Marked request #${requestData.id.slice(0, 6).toUpperCase()} as handled`,
                "assistance_management"
            );

            alert("Request marked as handled!");
            onClose();
        } catch (error) {
            console.error("Error updating request status:", error);
            alert("Failed to mark as handled. Please try again.");
        }
    };

    // Function to handle confirming request
    const handleConfirmRequest = async () => {
        try {
            const requestRef = doc(db, "assistance_request", requestData.id);
            await updateDoc(requestRef, {
                status: "In Progress",
                notes: notes || "",
            });

            // Log the activity
            await logActivity(
                barangayName,
                `Marked request #${requestData.id.slice(0, 6).toUpperCase()} as in progress`,
                "assistance_management"
            );

            alert("Request marked as In Progress!");
            onClose();
        } catch (error) {
            console.error("Error confirming:", error);
            alert("Failed to confirm.");
        }
    };

    // Function to handle forwarding request
    const handleForwardConfirm = async ({ reason, message }) => {
        try{
            const requestRef = doc(db, "assistance_request", requestData.id);
            await updateDoc(requestRef, {
                status: "Forwarded to CDRRMO",
                adminStatus: "Pending",
                forwardReason: reason,
                forwardMessage: message || "",
            });

            // Log the activity
            await logActivity(
                barangayName,
                `Forwarded request #${requestData.id.slice(0, 6).toUpperCase()} to CDRRMO with reason: ${reason}`,
                "assistance_management"
            );

            alert("Request successfully forwarded to CDRRMO.");
            setIsForwardModalOpen(false);
            onClose();
        } catch (error) {
            console.error("Error forwarding request:", error);
            alert("Failed to forward the request. Please try again.");
        }
    };

    // Function to determine which buttons should be visible
    const getButtonVisibility = () => {
        // If request is already handled, show no buttons
        if (requestData.status === "Handled") {
            return {
                showConfirm: false,
                showForward: false,
                showMarkHandled: false
            };
        }
        
        // If request is pending, only show confirm button
        if (requestData.status === "Pending") {
            return {
                showConfirm: true,
                showForward: false,
                showMarkHandled: false
            };
        }
        
        // If request is in progress, show forward and mark as handled buttons
        if (requestData.status === "In Progress") {
            return {
                showConfirm: false,
                showForward: true,
                showMarkHandled: true
            };
        }

        // Default case
        return {
            showConfirm: false,
            showForward: false,
            showMarkHandled: false
        };
    };

    const buttonVisibility = getButtonVisibility();

    return (
        <div className="fixed inset-0 flex items-center justify-center z-40">
            <div className="bg-white w-[740px] h-auto border border-[#444444] rounded-[20px] shadow-lg p-6 relative">
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
                        alt="Resident"   
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
                    <p className="pb-2"><strong>Request Type:</strong> {requestData.assistanceType === "Emergency Assistance" && requestData.emergencyType ? `Emergency Assistance - ${requestData.emergencyType}` : requestData.assistanceType || "N/A"}</p>
                    <p className="pb-2"><strong>Priority:</strong> <span className={`ml-1 font-bold ${requestData.priority === "High" ? "text-red-600" : requestData.priority === "Moderate" ? "text-yellow-600" : requestData.priority === "Low" ? "text-green-600" : "text-gray-500"}`}>{requestData.priority || "N/A"}</span></p>
                    <p className="pb-2"><strong>Status:</strong> {requestData.status === "Forwarded to CDRRMO" ? `Forwarded (${requestData.adminStatus || "Waiting"})` : requestData.status}</p>
                    <p className="pb-2"><strong>Date & Time:</strong> {requestData.timestamp?.toDate().toLocaleString() || "N/A"}</p>
                    <p className="pb-2"><strong>Barangay:</strong> {requestData.barangay || "N/A"}</p>
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
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full border p-2 mt-1 rounded"
                        rows="3"
                        placeholder="Enter notes here..."
                    />
                </div>

                {/* Action Buttons Section */}
                <div className="mt-6 flex justify-between">
                    {/* Forward to CDRRMO Button */}
                    {buttonVisibility.showForward && (
                        <button
                            onClick={() => setIsForwardModalOpen(true)}
                            className="bg-yellow-400 hover:bg-yellow-500 text-white px-5 py-2 rounded-lg font-semibold"
                        >
                            Forward to CDRRMO
                        </button>
                    )}

                    {/* Confirm Request Button */}
                    {buttonVisibility.showConfirm && (
                        <button 
                            onClick={handleConfirmRequest} 
                            className="bg-blue-500 hover:bg-blue-600 text-white px-5 py-2 rounded-lg font-semibold"
                        >
                            Confirm Request
                        </button>
                    )}

                    {/* Mark as Handled Button */}
                    {buttonVisibility.showMarkHandled && (
                        <button
                            onClick={() => setIsConfirmModalOpen(true)}
                            className="bg-green-500 hover:bg-green-600 text-white px-5 py-2 rounded-lg font-semibold"
                        >
                            Mark as Handled
                        </button>
                    )}
                </div>
            </div>
            
            {/* Forward Rescue Modal */}
            <ForwardRescue
                isOpen={isForwardModalOpen}
                onClose={() => setIsForwardModalOpen(false)}
                requestData={requestData}
                onConfirm={handleForwardConfirm}
            />

            {/* Confirmation Modal for Mark as Handled */}
            {isConfirmModalOpen && (
                <div className="fixed inset-0 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
                        <h3 className="text-xl font-bold mb-4">Confirm Action</h3>
                        <p className="mb-6">Are you sure you want to mark this request as handled?</p>
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
                                    handleMarkasHandled();
                                }}
                                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RequestAssistanceModal_brgy;