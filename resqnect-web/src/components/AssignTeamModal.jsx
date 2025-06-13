import React, { useEffect, useState, useRef } from "react";
import { db } from "../firebase/firebaseConfig";
import { collection, query, where, getDocs, doc, updateDoc } from "firebase/firestore";
import { logActivity } from "../utils/logger";

const AssignTeamModal = ({ isOpen, onClose, requestData }) => {
    // State variables to store data
    const [selectedTeam, setSelectedTeam] = useState("");
    const [availableTeams, setAvailableTeams] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const modalRef = useRef(null);
    const dragStartPos = useRef({ x: 0, y: 0 });

    // Handle drag start
    const handleDragStart = (e) => {
        if (e.target.className.includes('drag-handle')) {
            setIsDragging(true);
            dragStartPos.current = {
                x: e.clientX - position.x,
                y: e.clientY - position.y
            };
        }
    };

    // Handle drag
    const handleDrag = (e) => {
        if (isDragging) {
            setPosition({
                x: e.clientX - dragStartPos.current.x,
                y: e.clientY - dragStartPos.current.y
            });
        }
    };

    // Handle drag end
    const handleDragEnd = () => {
        setIsDragging(false);
    };

    // Add and remove event listeners
    useEffect(() => {
        if (isOpen) {
            document.addEventListener('mousemove', handleDrag);
            document.addEventListener('mouseup', handleDragEnd);
        }
        return () => {
            document.removeEventListener('mousemove', handleDrag);
            document.removeEventListener('mouseup', handleDragEnd);
        };
    }, [isOpen, isDragging]);

    // Fetch available teams when modal opens
    useEffect(() => {
        const fetchAvailableTeams = async () => {
            try {
                // Get all teams that are either on standby or currently assigned to this request
                const q = query(
                    collection(db, "rescue_teams"),
                    where("status", "==", "Standby")
                );
                const querySnapshot = await getDocs(q);
                const teams = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setAvailableTeams(teams);
            } catch (error) {
                console.error("Error fetching teams:", error);
                alert("Error loading teams. Please try again.");
            }
        };

        if (isOpen) {
            fetchAvailableTeams();
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleConfirm = async () => {
        if (!selectedTeam) {
            alert("Please select a team first!");
            return;
        }

        // Add confirmation dialog
        const confirmAssign = window.confirm("Are you sure you want to assign this team to the request?");
        if (!confirmAssign) return;

        setIsLoading(true);
        try {
            const adminName = localStorage.getItem('adminName') || 'Admin';
            const adminRole = localStorage.getItem('adminRole') || 'Admin';
            
            // Get the selected team's data
            const selectedTeamData = availableTeams.find(team => team.teamName === selectedTeam);
            
            // If there was a previously assigned team, update their status
            if (requestData.assignedTeam) {
                const previousTeamQuery = query(
                    collection(db, "rescue_teams"),
                    where("teamName", "==", requestData.assignedTeam)
                );
                const previousTeamSnapshot = await getDocs(previousTeamQuery);
                
                if (!previousTeamSnapshot.empty) {
                    const previousTeamRef = previousTeamSnapshot.docs[0].ref;
                    await updateDoc(previousTeamRef, {
                        status: "Standby",
                        requestID: ""
                    });

                    // Log previous team unassignment
                    await logActivity(
                        `${adminName} (${adminRole})`,
                        `Unassigned team ${requestData.assignedTeam} from request #${requestData.id.slice(0, 6).toUpperCase()}`,
                        "assistance_management"
                    );
                }
            }

            // Update the request with new team assignment
            const requestRef = doc(db, "assistance_request", requestData.id);
            await updateDoc(requestRef, {
                adminStatus: "In Progress",
                assignedTeam: selectedTeam
            });

            // Update the newly assigned team's status
            if (selectedTeamData) {
                const teamRef = doc(db, "rescue_teams", selectedTeamData.id);
                await updateDoc(teamRef, {
                    status: "On Duty",
                    requestID: requestData.id
                });

                // Log new team assignment
                await logActivity(
                    `${adminName} (${adminRole})`,
                    `Assigned team ${selectedTeam} to request #${requestData.id.slice(0, 6).toUpperCase()}`,
                    "assistance_management"
                );
            }

            // Close the modal and show success message
            alert("Team assigned successfully!");
            onClose();
        } catch (error) {
            console.error("Error assigning team:", error);
            alert("Error assigning team. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 flex items-center justify-center z-50">
            <div 
                ref={modalRef}
                className="bg-white w-[620px] rounded-[20px] border border-[#444444] shadow-lg p-6 relative"
                style={{
                    transform: `translate(${position.x}px, ${position.y}px)`,
                    cursor: isDragging ? 'grabbing' : 'default'
                }}
            >
                <div 
                    className="drag-handle absolute top-0 left-0 right-0 h-8 cursor-grab active:cursor-grabbing"
                    onMouseDown={handleDragStart}
                />
                <button 
                    onClick={onClose} 
                    className="absolute top-4 right-6 text-2xl text-[#444444] hover:text-black cursor-pointer"
                    disabled={isLoading}
                >
                    &times;
                </button>
                <h2 className="text-center text-xl font-bold text-[#444444] tracking-wide mb-6">
                    ASSIGN A RESPONSE TEAM
                </h2>

                <div className="text-[#444444] mb-4">
                    <p><strong>Request ID:</strong> #{requestData.id.slice(0, 6).toUpperCase()}</p>
                    <p><strong>Resident Name:</strong> {requestData.fullName}</p>
                    <p><strong>Request Type:</strong> {requestData.assistanceType}</p>
                </div>

                <div className="mb-4">
                    <label className="block text-[#444444] font-bold mb-1">Select Team:</label>
                    <select 
                        value={selectedTeam} 
                        onChange={(e) => setSelectedTeam(e.target.value)}
                        className="w-full border border-[#0077B6] rounded px-3 py-2"
                        disabled={isLoading}
                    >
                        <option value="">Select available team</option>
                        {availableTeams.map((team) => (
                            <option key={team.id} value={team.teamName}>
                                {team.teamName} ({team.status})
                            </option>
                        ))}
                    </select>
                </div>

                <div className="flex justify-end gap-4 mt-4">
                    <button 
                        onClick={onClose} 
                        className="border-2 hover:bg-gray-200 px-6 py-2 rounded-lg"
                        disabled={isLoading}
                    >
                        Close
                    </button>
                    <button 
                        onClick={handleConfirm} 
                        className="bg-[#1848A0] text-white px-6 py-2 rounded-lg hover:bg-blue-800 disabled:bg-gray-400"
                        disabled={isLoading}
                    >
                        {isLoading ? "Assigning..." : "Confirm Assignment"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AssignTeamModal;
