import React, { useState } from 'react';

const ArchiveModal = ({ isOpen, onClose, onArchive, residentName }) => {
    const [reason, setReason] = useState('');
    const [otherReason, setOtherReason] = useState('');

    if (!isOpen) return null;

    const handleSubmit = () => {
        const finalReason = reason === 'Other' ? otherReason : reason;
        if (!finalReason) {
            alert('Please select or specify a reason');
            return;
        }
        onArchive(finalReason);
        onClose();
    };

    return (
        <div className="fixed inset-0 flex items-center justify-center">
            <div className="bg-white rounded-lg p-6 w-[500px]">
                <h2 className="text-xl font-bold text-[#1848A0] mb-4">Archive Resident</h2>
                <p className="text-gray-600 mb-4">
                    Are you sure you want to archive {residentName}? This action is permanent unless unarchived.
                </p>
                
                <div className="mb-4">
                    <label className="block text-gray-700 mb-2">Reason for archiving:</label>
                    <select
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-[#1848A0]"
                    >
                        <option value="">Select a reason</option>
                        <option value="Moved to another country">Moved to another country</option>
                        <option value="Moved to another city">Moved to another city</option>
                        <option value="Deceased">Deceased</option>
                        <option value="Other">Other</option>
                    </select>
                </div>

                {reason === 'Other' && (
                    <div className="mb-4">
                        <label className="block text-gray-700 mb-2">Specify reason:</label>
                        <input
                            type="text"
                            value={otherReason}
                            onChange={(e) => setOtherReason(e.target.value)}
                            className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-[#1848A0]"
                            placeholder="Enter reason"
                        />
                    </div>
                )}

                <div className="flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-600 hover:text-gray-800"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="px-4 py-2 bg-[#1848A0] text-white rounded hover:bg-[#153d8a]"
                    >
                        Archive
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ArchiveModal; 