import React, { useState, useEffect } from "react";
import { doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";

const TeamDetailsModal = ({ isOpen, onClose, teamData, onUpdate, onDelete }) => {
    // State for editable fields
    const [editedTeam, setEditedTeam] = useState({
        teamName: "",
        contactNumber: "",
        memberCount: 0,
        members: [],
        status: ""
    });

    // Update state when teamData changes
    useEffect(() => {
        if (teamData) {
            setEditedTeam({
                teamName: teamData.teamName || "",
                contactNumber: teamData.contactNumber || "",
                memberCount: teamData.memberCount || 0,
                members: teamData.members || [],
                status: teamData.status || "Standby"
            });
        }
    }, [teamData]);

    if (!isOpen || !teamData) return null;

    // Function to validate Philippine mobile number format
    const validatePhoneNumber = (number) => {
        const phoneRegex = /^09\d{9}$/;
        return phoneRegex.test(number);
    };

    // Handle input changes
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setEditedTeam(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Handle member information changes
    const handleMemberChange = (index, field, value) => {
        const updatedMembers = [...editedTeam.members];
        updatedMembers[index] = {
            ...updatedMembers[index],
            [field]: value
        };
        setEditedTeam(prev => ({
            ...prev,
            members: updatedMembers
        }));
    };

    // Handle team leader change
    const handleLeaderChange = (index) => {
        const updatedMembers = editedTeam.members.map((member, i) => ({
            ...member,
            isLeader: i === index
        }));
        setEditedTeam(prev => ({
            ...prev,
            members: updatedMembers
        }));
    };

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Validate form data
        if (!validateForm()) {
            return;
        }

        try {
            await onUpdate(teamData.id, editedTeam);
            onClose();
        } catch (error) {
            console.error("Error updating team:", error);
        }
    };

    // Handle team deletion
    const handleDelete = async () => {
        if (window.confirm("Are you sure you want to delete this team?")) {
            try {
                await onDelete(teamData.id, teamData.teamName);
                onClose();
            } catch (error) {
                console.error("Error deleting team:", error);
            }
        }
    };

    // Validate form data
    const validateForm = () => {
        // Validate phone number
        if (!validatePhoneNumber(editedTeam.contactNumber)) {
            alert("Invalid Philippine mobile number format (09XX-XXX-XXXX)");
            return false;
        }

        // Validate team name
        if (!editedTeam.teamName.trim()) {
            alert("Team name is required");
            return false;
        }

        return true;
    };

    return (
        <div className="fixed inset-0 flex items-center justify-center z-50">
            <div className="bg-white w-[620px] rounded-[20px] shadow-lg p-6 relative max-h-[90vh] overflow-y-auto">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-6 text-2xl text-[#444444] hover:text-black cursor-pointer"    
                >
                    &times;
                </button>

                <h2 className="text-center text-[xl] font-bold text-[#444444] tracking-wide mb-6">
                    TEAM DETAILS
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Team ID */}
                    <div>
                        <p className="font-bold text-[#444444]">Team ID:</p>
                        <p className="text-blue-600 font-bold">#{teamData.id.slice(0, 6).toUpperCase()}</p>
                    </div>

                    {/* Team Name */}
                    <div>
                        <label className="font-bold text-[#444444]">Team Name:</label>
                        <input
                            type="text"
                            name="teamName"
                            value={editedTeam.teamName}
                            onChange={handleInputChange}
                            className="w-full border border-[#0077b6] rounded px-3 py-2 mt-1"
                        />
                    </div>

                    {/* Contact Number */}
                    <div>
                        <label className="font-bold text-[#444444]">Contact Number:</label>
                        <input
                            type="text"
                            name="contactNumber"
                            value={editedTeam.contactNumber}
                            onChange={handleInputChange}
                            placeholder="09XX-XXX-XXXX"
                            className="w-full border border-[#0077b6] rounded px-3 py-2 mt-1"
                        />
                    </div>

                    {/* Status */}
                    <div>
                        <label className="font-bold text-[#444444]">Status:</label>
                        <select
                            name="status"
                            value={editedTeam.status}
                            onChange={handleInputChange}
                            className="w-full border border-[#0077b6] rounded px-3 py-2 mt-1"
                        >
                            <option value="Standby">Standby</option>
                            <option value="On Duty">On Duty</option>
                        </select>
                    </div>

                    {/* Assigned Request */}
                    <div>
                        <p className="font-bold text-[#444444]">Assigned Request:</p>
                        <p>{teamData.requestID ? `#${teamData.requestID.slice(0, 6).toUpperCase()}` : "No assigned request"}</p>
                    </div>

                    {/* Team Members */}
                    <div>
                        <p className="font-bold text-[#444444] mb-2">Team Members:</p>
                        <div className="space-y-2">
                            {editedTeam.members.map((member, index) => (
                                <div key={index} className="border p-3 rounded bg-gray-100">
                                    <div className="flex justify-between items-center mb-2">
                                        <h4 className="font-semibold text-[#1848a0]">Member #{index + 1}</h4>
                                        <label className="flex items-center space-x-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="leader"
                                                checked={member.isLeader}
                                                onChange={() => handleLeaderChange(index)}
                                                className="form-radio text-[#1848a0]"
                                            />
                                            <span className="text-sm font-medium">Team Leader</span>
                                        </label>
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Full Name"
                                        value={member.name}
                                        onChange={(e) => handleMemberChange(index, "name", e.target.value)}
                                        className="w-full mb-2 border border-[#0077b6] rounded px-3 py-1"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Contact Number (09XX-XXX-XXXX)"
                                        value={member.contact}
                                        onChange={(e) => handleMemberChange(index, "contact", e.target.value)}
                                        className="w-full border border-[#0077b6] rounded px-3 py-1"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end gap-4 mt-6">
                        <button
                            type="button"
                            onClick={handleDelete}
                            className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700"
                        >
                            Delete Team
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="border border-[#444444] px-6 py-2 rounded-lg hover:bg-gray-200"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="bg-[#1848a0] text-white px-6 py-2 rounded-lg hover:bg-blue-800"
                        >
                            Save Changes
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default TeamDetailsModal; 