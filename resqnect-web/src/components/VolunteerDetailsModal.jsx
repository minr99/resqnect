import React, { useState, useEffect } from 'react';

const VolunteerDetailsModal = ({ isOpen, onClose, volunteerData, onUpdate, onDelete }) => {
    const [formData, setFormData] = useState({
        groupName: '',
        leaderName: '',
        contactNumber: '',
        members: [],
        status: 'Active'
    });

    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

    useEffect(() => {
        if (volunteerData) {
            setFormData({
                groupName: volunteerData.groupName || '',
                leaderName: volunteerData.leaderName || '',
                contactNumber: volunteerData.contactNumber || '',
                members: volunteerData.members || [],
                status: volunteerData.status || 'Active'
            });
        }
    }, [volunteerData]);

    if (!isOpen || !volunteerData) return null;

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleMemberChange = (index, field, value) => {
        const newMembers = [...formData.members];
        newMembers[index] = {
            ...newMembers[index],
            [field]: value
        };
        setFormData(prev => ({
            ...prev,
            members: newMembers
        }));
    };

    const addMember = () => {
        setFormData(prev => ({
            ...prev,
            members: [...prev.members, { name: '', contact: '' }]
        }));
    };

    const removeMember = (index) => {
        setFormData(prev => ({
            ...prev,
            members: prev.members.filter((_, i) => i !== index)
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onUpdate(volunteerData.id, formData);
        onClose();
    };

    const handleDelete = () => {
        onDelete(volunteerData.id, volunteerData.groupName);
        setIsDeleteConfirmOpen(false);
        onClose();
    };

    return (
        <div className="fixed inset-0 flex items-center justify-center z-50">
            <div className="bg-white w-[600px] rounded-[20px] shadow-lg p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-[#444444]">Volunteer Group Details</h2>
                    <button
                        onClick={onClose}
                        className="text-2xl text-[#444444] hover:text-black"
                    >
                        &times;
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    {/* Group Information */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-[#444444] font-semibold mb-1">
                                Group Name
                            </label>
                            <input
                                type="text"
                                name="groupName"
                                value={formData.groupName}
                                onChange={handleInputChange}
                                className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#0077B6]"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-[#444444] font-semibold mb-1">
                                Leader Name
                            </label>
                            <input
                                type="text"
                                name="leaderName"
                                value={formData.leaderName}
                                onChange={handleInputChange}
                                className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#0077B6]"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-[#444444] font-semibold mb-1">
                                Contact Number
                            </label>
                            <input
                                type="text"
                                name="contactNumber"
                                value={formData.contactNumber}
                                onChange={handleInputChange}
                                className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#0077B6]"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-[#444444] font-semibold mb-1">
                                Status
                            </label>
                            <select
                                name="status"
                                value={formData.status}
                                onChange={handleInputChange}
                                className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#0077B6]"
                            >
                                <option value="Active">Active</option>
                                <option value="Inactive">Inactive</option>
                            </select>
                        </div>
                    </div>

                    {/* Members List */}
                    <div className="mt-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-[#444444] font-semibold">Group Members</h3>
                            <button
                                type="button"
                                onClick={addMember}
                                className="text-[#0077B6] hover:text-[#005b8c] font-medium"
                            >
                                + Add Member
                            </button>
                        </div>

                        <div className="space-y-4 max-h-[300px] overflow-y-auto">
                            {formData.members.map((member, index) => (
                                <div key={index} className="flex items-center gap-4">
                                    <div className="flex-1">
                                        <input
                                            type="text"
                                            placeholder="Member Name"
                                            value={member.name}
                                            onChange={(e) => handleMemberChange(index, 'name', e.target.value)}
                                            className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#0077B6]"
                                            required
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <input
                                            type="text"
                                            placeholder="Contact Number"
                                            value={member.contact}
                                            onChange={(e) => handleMemberChange(index, 'contact', e.target.value)}
                                            className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#0077B6]"
                                            required
                                        />
                                    </div>
                                    {index > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => removeMember(index)}
                                            className="text-red-500 hover:text-red-700"
                                        >
                                            Remove
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-6 flex justify-between">
                        <div className="space-x-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="bg-gray-500 text-white px-6 py-2 rounded-lg font-semibold hover:bg-gray-600 cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="bg-[#1848A0] text-white px-6 py-2 rounded-lg font-semibold hover:bg-[#153d8a] cursor-pointer"
                            >
                                Save Changes
                            </button>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsDeleteConfirmOpen(true)}
                            className="bg-red-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-red-700 cursor-pointer"
                        >
                            Delete Group
                        </button>
                    </div>
                </form>
            </div>

            {/* Delete Confirmation Modal */}
            {isDeleteConfirmOpen && (
                <div className="fixed inset-0 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
                        <h3 className="text-xl font-bold mb-4">Confirm Deletion</h3>
                        <p className="mb-6">Are you sure you want to delete this volunteer group? This action cannot be undone.</p>
                        <div className="flex justify-end gap-4">
                            <button
                                onClick={() => setIsDeleteConfirmOpen(false)}
                                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 cursor-pointer"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VolunteerDetailsModal; 