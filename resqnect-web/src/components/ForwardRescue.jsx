import React, {useState} from "react";

const ForwardRescue = ({isOpen, onClose, requestData, onConfirm}) => {
    const [reason, setReason] = useState("");
    const [customReason, setCustomReason] = useState("");
    const [message, setMessage] = useState("");

    if(!isOpen) return null;

    const handleConfirm = () => {
        const finalReason = reason === "Other" ? customReason: reason;
        if(!finalReason) {
            alert("Please provide a reason for forwarding.");
            return;
        }

        onConfirm({
            reason: finalReason,
            message,
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 flex items-center justify-center z-50">
            <div className="bg-white w-[620px] rounded-[20px] shadow-lg p-6 relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-6 text-2xl text-[#444444] hover:text-black cursor-pointer"
                >
                    &times;
                </button>
                <h2 className="text-center text-xl font-bold text-[#444444] tracking-wide mb-6">
                    FORWARD ASSISTANCE REQUEST TO CDRRMO
                </h2>

                <div className="text-[#444444] mb-4">
                    <p><strong>Resident Name:</strong> {requestData.name}</p>
                    <p><strong>Request Type:</strong> {requestData.type}</p>
                </div>

                <div className="mb-4">
                    <label className="block text-[#444444] font-bold mb-1">Reason for Forwarding:</label>
                    <select
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="w-full border border-[#0077b6] rounded px-3 py-2"
                    >
                        <option value="">Select a reason</option>
                        <option value="No available team">No available team</option>
                        <option value="Need additional equipment">Need additional equipment</option>
                        <option value="High risk situation">High risk situation</option>
                        <option value="Other">Other (please specify below)</option>
                    </select>
                </div>

                {reason === "Other" && (
                    <textarea
                        className="w-full border p-2 rounded mb-4"
                        rows="2"
                        placeholder="Specify your reason here..."
                        value={customReason}
                        onChange={(e) => setCustomReason(e.target.value)}
                    ></textarea>
                )}

                <div className="mb-4">
                    <label className="block text-[#444444] font-bold mb-1">Additional Message (Optional):</label>
                    <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        rows="3"
                        className="w-full border p-2 rounded"
                        placeholder="Enter message here..."
                    ></textarea>
                </div>

                <div className="flex justify-end gap-4 mt-4">
                    <button
                        onClick={onClose}
                        className="border border-[#444444] px-6 py-2 rounded-lg hover:bg-gray-200"
                    >
                        Close
                    </button>
                    <button
                        onClick={handleConfirm}
                        className="bg-[#1848a0] text-white px-6 py-2 rounded-lg hover:bg-blue-800"
                    >
                        Confirm Forwarding
                    </button>
                </div>
            </div>
        </div>
    );

};

export default ForwardRescue;