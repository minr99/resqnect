import React, { useState } from 'react';

const AddVolunteerModal = ({ isOpen, onClose, onSubmit }) => {
    const [formData, setFormData] = useState({
        groupName: '',
        leaderName: '',
        contactNumber: '',
        members: [{ name: '', contact: '' }]
    });

    if (!isOpen) return null;

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
        onSubmit(formData);
        onClose();
    };

    return (
        <div className="fixed inset-0 flex items-center justify-center z-50">
            <div className="bg-white w-[600px] rounded-[20px] shadow-lg p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-[#444444]">Add Volunteer Group</h2>
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

                    {/* Submit Button */}
                    <div className="mt-6 flex justify-end">
                        <button
                            type="submit"
                            className="bg-[#1848A0] text-white px-6 py-2 rounded-lg font-semibold hover:bg-[#153d8a]"
                        >
                            Add Volunteer Group
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddVolunteerModal; 