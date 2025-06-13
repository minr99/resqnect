import React, {useState} from "react";

const AddTeamModal = ({ isOpen, onClose, onSubmit }) => {
    // State variables to store form data
    const [teamName, setTeamName] = useState("");
    const [contactNumber, setContactNumber] = useState("");
    const [numMembers, setNumMembers] = useState(0);
    const [members, setMembers] = useState([]);
    const [errors, setErrors] = useState({});
    // New state for confirmation dialog
    const [showConfirmation, setShowConfirmation] = useState(false);

    // If modal is not open, don't render anything
    if(!isOpen) return null;

    // Function to validate Philippine mobile number format
    const validatePhoneNumber = (number) => {
        // This regex checks if the number starts with 09 and has 11 digits
        const phoneRegex = /^09\d{9}$/;
        return phoneRegex.test(number);
    };

    // Function to validate all form fields
    const validateForm = () => {
        const newErrors = {};
        
        // Check if team name is empty or too short
        if (!teamName.trim()) {
            newErrors.teamName = "Team name is required";
        } else if (teamName.length < 3) {
            newErrors.teamName = "Team name must be at least 3 characters";
        }

        // Check if contact number is valid
        if (!contactNumber.trim()) {
            newErrors.contactNumber = "Contact number is required";
        } else if (!validatePhoneNumber(contactNumber)) {
            newErrors.contactNumber = "Invalid Philippine mobile number format (09XX-XXX-XXXX)";
        }

        // Check if team has enough members
        if (numMembers < 2) {
            newErrors.numMembers = "Team must have at least 2 members";
        }

        // Check each member's information
        members.forEach((member, index) => {
            if (!member.name.trim()) {
                newErrors[`member${index}Name`] = "Member name is required";
            }
            if (!member.contact.trim()) {
                newErrors[`member${index}Contact`] = "Member contact is required";
            } else if (!validatePhoneNumber(member.contact)) {
                newErrors[`member${index}Contact`] = "Invalid Philippine mobile number format";
            }
        });

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Function to handle number of members change
    const handleNumbersChange = (e) => {
        const count = parseInt(e.target.value);
        if (count >= 2 && count <= 10) { // Limit team size to 2-10 members
            setNumMembers(count);
            const updatedMembers = Array.from({ length: count }, (_, i) => ({
                name: members[i]?.name || "",
                contact: members[i]?.contact || "",
                isLeader: i === 0 // First member is leader by default
            }));
            setMembers(updatedMembers);
        }
    };

    // Function to handle member information changes
    const handleMemberChange = (index, field, value) => {
        const updated = [...members];
        updated[index][field] = value;
        setMembers(updated);
    };

    // Function to handle team leader change
    const handleLeaderChange = (index) => {
        const updated = members.map((member, i) => ({
            ...member,
            isLeader: i === index
        }));
        setMembers(updated);
    };

    // Function to handle the initial submit (shows confirmation)
    const handleInitialSubmit = () => {
        if (!validateForm()) {
            return;
        }
        setShowConfirmation(true);
    };

    // Function to handle the final confirmation and submit
    const handleConfirm = () => {
        const teamData = {
            teamName,
            contactNumber,
            numMembers,
            members,
            status: "Standby",
            assignedRequestId: "",
            createdAt: new Date().toISOString()
        };
        onSubmit(teamData);
        handleClose();
    };

    // Function to handle closing the modal
    const handleClose = () => {
        onClose();
        setTeamName("");
        setContactNumber("");
        setNumMembers(0);
        setMembers([]);
        setErrors({});
        setShowConfirmation(false);
    };

    // Render the confirmation dialog
    const renderConfirmationDialog = () => {
        if (!showConfirmation) return null;

        return (
            <div className="fixed inset-0 flex items-center justify-center">
                <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                    <h3 className="text-xl font-bold text-[#444444] mb-4">Confirm Team Details</h3>
                    
                    <div className="space-y-3 mb-6">
                        <p><span className="font-semibold">Team Name:</span> {teamName}</p>
                        <p><span className="font-semibold">Contact Number:</span> {contactNumber}</p>
                        <p><span className="font-semibold">Number of Members:</span> {numMembers}</p>
                        <div>
                            <p className="font-semibold mb-2">Team Members:</p>
                            <ul className="list-disc pl-5 space-y-1">
                                {members.map((member, index) => (
                                    <li key={index}>
                                        {member.name} {member.isLeader ? "(Leader)" : ""}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    <div className="flex justify-end space-x-4">
                        <button
                            onClick={() => setShowConfirmation(false)}
                            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
                        >
                            Edit Details
                        </button>
                        <button
                            onClick={handleConfirm}
                            className="px-4 py-2 bg-[#1848a0] text-white rounded-lg hover:bg-blue-800"
                        >
                            Confirm & Add Team
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 flex items-center justify-center z-50">
            <div className="bg-white w-[620px] rounded-[20px] shadow-lg p-6 relative max-h-[90vh] overflow-y-auto">
                <button
                    onClick={handleClose}
                    className="absolute top-4 right-6 text-2xl text-[#444444] hover:text-black cursor-pointer"    
                >
                    &times;
                </button>

                <h2 className="text-center text-[xl] font-bold text-[#444444] tracking-wide mb-6">
                    ADD NEW RESCUE TEAM
                </h2>

                <div className="space-y-4">
                    <div>
                        <label className="font-bold text-[#444444]">Team Name:</label>
                        <input
                            type="text"
                            className={`w-full border ${errors.teamName ? 'border-red-500' : 'border-[#0077b6]'} rounded px-3 py-2`}
                            value={teamName}
                            onChange={(e) => setTeamName(e.target.value)}
                        />
                        {errors.teamName && <p className="text-red-500 text-sm mt-1">{errors.teamName}</p>}
                    </div>

                    <div>
                        <label className="font-bold text-[#444444]">Team Contact Number:</label>
                        <input
                            type="text"
                            placeholder="09XX-XXX-XXXX"
                            className={`w-full border ${errors.contactNumber ? 'border-red-500' : 'border-[#0077b6]'} rounded px-3 py-2`}
                            value={contactNumber}
                            onChange={(e) => setContactNumber(e.target.value)}
                        />
                        {errors.contactNumber && <p className="text-red-500 text-sm mt-1">{errors.contactNumber}</p>}
                    </div>

                    <div>
                        <label className="font-bold text-[#444444]">Number of Members (2-10):</label>
                        <input
                            type="number"
                            min="2"
                            max="10"
                            className={`w-full border ${errors.numMembers ? 'border-red-500' : 'border-[#0077b6]'} rounded px-3 py-2`}
                            value={numMembers}
                            onChange={handleNumbersChange}
                        />
                        {errors.numMembers && <p className="text-red-500 text-sm mt-1">{errors.numMembers}</p>}
                    </div>

                    {members.map((member, index) => (
                        <div key={index} className="border p-3 rounded mb-2 bg-gray-100">
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
                                className={`w-full mb-2 border ${errors[`member${index}Name`] ? 'border-red-500' : 'border-[#0077b6]'} rounded px-3 py-1`}
                                value={member.name}
                                onChange={(e) => handleMemberChange(index, "name", e.target.value)}
                            />
                            {errors[`member${index}Name`] && <p className="text-red-500 text-sm mb-1">{errors[`member${index}Name`]}</p>}
                            <input
                                type="text"
                                placeholder="Contact Number (09XX-XXX-XXXX)"
                                className={`w-full border ${errors[`member${index}Contact`] ? 'border-red-500' : 'border-[#0077b6]'} rounded px-3 py-1`}
                                value={member.contact}
                                onChange={(e) => handleMemberChange(index, "contact", e.target.value)}
                            />
                            {errors[`member${index}Contact`] && <p className="text-red-500 text-sm mt-1">{errors[`member${index}Contact`]}</p>}
                        </div>
                    ))}
                </div>

                <div className="flex justify-end gap-4 mt-6">
                    <button
                        onClick={handleClose}
                        className="border border-[#444444] px-6 py-2 rounded-lg hover:bg-gray-200"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleInitialSubmit}
                        className="bg-[#1848a0] text-white px-6 py-2 rounded-lg hover:bg-blue-800"
                    >
                        Add Team
                    </button>
                </div>
            </div>

            {/* Render the confirmation dialog */}
            {renderConfirmationDialog()}
        </div>
    );
};

export default AddTeamModal;