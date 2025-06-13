import React, { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import { db } from "../firebase/firebaseConfig";
import { collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, Timestamp } from "firebase/firestore";
import AddTeamModal from "../components/AddTeamModal";
import TeamDetailsModal from "../components/TeamDetailsModal";
import PrivacyPolicyModal from "../components/PrivacyPolicyModal";
import AddVolunteerModal from "../components/AddVolunteerModal";
import VolunteerDetailsModal from "../components/VolunteerDetailsModal";
import { logActivity } from "../utils/logger";

const TeamManagementPage = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [teams, setTeams] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [isAddTeamModalOpen, setIsAddTeamModalOpen] = useState(false);
    const [isTeamDetailsModalOpen, setIsTeamDetailsModalOpen] = useState(false);
    const [selectedTeam, setSelectedTeam] = useState(null);
    const [isPrivacyPolicyOpen, setIsPrivacyPolicyOpen] = useState(false);
    const [filterCount, setFilterCount] = useState(0);

    // New states for volunteers
    const [volunteers, setVolunteers] = useState([]);
    const [isAddVolunteerModalOpen, setIsAddVolunteerModalOpen] = useState(false);
    const [isVolunteerDetailsModalOpen, setIsVolunteerDetailsModalOpen] = useState(false);
    const [selectedVolunteer, setSelectedVolunteer] = useState(null);
    const [volunteerSearchTerm, setVolunteerSearchTerm] = useState("");

    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, "rescue_teams"), (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setTeams(data);
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, "accredited_volunteers"), (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setVolunteers(data);
        });

        return () => unsubscribe();
    }, []);

    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    const filteredTeams = teams.filter(team => {
        const matchesSearch = searchTerm === "" || 
            (team.teamName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            team.id?.toLowerCase().includes(searchTerm.toLowerCase()));
        
        const matchesStatus = statusFilter === "" || team.status === statusFilter;
        
        return matchesSearch && matchesStatus;
    });

    // Update filter count whenever filters change
    useEffect(() => {
        const activeFilters = [
            searchTerm !== "" ? 1 : 0,
            statusFilter !== "" ? 1 : 0
        ].reduce((a, b) => a + b, 0);
        setFilterCount(activeFilters);
    }, [searchTerm, statusFilter]);

    const clearFilters = () => {
        setSearchTerm("");
        setStatusFilter("");
    };

    const handleAddTeamSubmit = async (teamData) => {
        try {
            const docRef = await addDoc(collection(db, "rescue_teams"), {
                teamName: teamData.teamName,
                contactNumber: teamData.contactNumber,
                memberCount: teamData.numMembers,
                members: teamData.members,
                status: teamData.status,
                requestID: teamData.assignedRequestId
            });
            
            // Log the activity
            const adminName = localStorage.getItem('adminName') || 'Admin';
            const adminRole = localStorage.getItem('adminRole') || 'Admin';
            await logActivity(
                `${adminName} (${adminRole})`,
                `Added new rescue team: ${teamData.teamName}`,
                'team_management'
            );
            
            console.log("Team successfully added!");
        } catch (error) {
            console.error("Error adding team:", error);
        }
    };

    const handleTeamUpdate = async (teamId, updatedData) => {
        try {
            const teamRef = doc(db, "rescue_teams", teamId);
            const oldTeamData = teams.find(team => team.id === teamId);
            
            // Create a detailed changes message
            const changes = [];
            if (updatedData.teamName !== oldTeamData.teamName) {
                changes.push(`Team Name: ${oldTeamData.teamName} → ${updatedData.teamName}`);
            }
            if (updatedData.contactNumber !== oldTeamData.contactNumber) {
                changes.push(`Contact Number: ${oldTeamData.contactNumber} → ${updatedData.contactNumber}`);
            }
            if (updatedData.memberCount !== oldTeamData.memberCount) {
                changes.push(`Member Count: ${oldTeamData.memberCount} → ${updatedData.memberCount}`);
            }
            if (updatedData.status !== oldTeamData.status) {
                changes.push(`Status: ${oldTeamData.status} → ${updatedData.status}`);
            }
            if (updatedData.requestID !== oldTeamData.requestID) {
                changes.push(`Request ID: ${oldTeamData.requestID || 'None'} → ${updatedData.requestID || 'None'}`);
            }
            
            await updateDoc(teamRef, updatedData);
            
            // Log the activity with detailed changes
            const adminName = localStorage.getItem('adminName') || 'Admin';
            const adminRole = localStorage.getItem('adminRole') || 'Admin';
            await logActivity(
                `${adminName} (${adminRole})`,
                `Updated rescue team: ${oldTeamData.teamName} - Changes: ${changes.join(', ')}`,
                'team_management'
            );
        } catch (error) {
            console.error("Error updating team:", error);
        }
    };

    const handleTeamDelete = async (teamId, teamName) => {
        try {
            await deleteDoc(doc(db, "rescue_teams", teamId));
            
            // Log the activity
            const adminName = localStorage.getItem('adminName') || 'Admin';
            const adminRole = localStorage.getItem('adminRole') || 'Admin';
            await logActivity(
                `${adminName} (${adminRole})`,
                `Deleted rescue team: ${teamName}`,
                'team_management'
            );
        } catch (error) {
            console.error("Error deleting team:", error);
        }
    };

    const handleTeamClick = (team) => {
        setSelectedTeam(team);
        setIsTeamDetailsModalOpen(true);
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            const sidebar = document.getElementById("sidebar");
            if(sidebar && !sidebar.contains(event.target)){
                setIsSidebarOpen(false);
            }
        };

        if(isSidebarOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        } else {
            document.removeEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isSidebarOpen]);

    // New functions for volunteers
    const handleAddVolunteerSubmit = async (volunteerData) => {
        try {
            const docRef = await addDoc(collection(db, "accredited_volunteers"), {
                groupName: volunteerData.groupName,
                leaderName: volunteerData.leaderName,
                contactNumber: volunteerData.contactNumber,
                members: volunteerData.members,
                dateAccredited: Timestamp.now(),
                status: "Active"
            });
            
            // Log the activity
            const adminName = localStorage.getItem('adminName') || 'Admin';
            const adminRole = localStorage.getItem('adminRole') || 'Admin';
            await logActivity(
                `${adminName} (${adminRole})`,
                `Added new volunteer group: ${volunteerData.groupName}`,
                'volunteer_management'
            );
            
            console.log("Volunteer group successfully added!");
        } catch (error) {
            console.error("Error adding volunteer group:", error);
        }
    };

    const handleVolunteerUpdate = async (volunteerId, updatedData) => {
        try {
            const volunteerRef = doc(db, "accredited_volunteers", volunteerId);
            const oldVolunteerData = volunteers.find(v => v.id === volunteerId);
            
            // Create a detailed changes message
            const changes = [];
            if (updatedData.groupName !== oldVolunteerData.groupName) {
                changes.push(`Group Name: ${oldVolunteerData.groupName} → ${updatedData.groupName}`);
            }
            if (updatedData.leaderName !== oldVolunteerData.leaderName) {
                changes.push(`Leader Name: ${oldVolunteerData.leaderName} → ${updatedData.leaderName}`);
            }
            if (updatedData.contactNumber !== oldVolunteerData.contactNumber) {
                changes.push(`Contact Number: ${oldVolunteerData.contactNumber} → ${updatedData.contactNumber}`);
            }
            if (updatedData.status !== oldVolunteerData.status) {
                changes.push(`Status: ${oldVolunteerData.status} → ${updatedData.status}`);
            }
            
            await updateDoc(volunteerRef, updatedData);
            
            // Log the activity
            const adminName = localStorage.getItem('adminName') || 'Admin';
            const adminRole = localStorage.getItem('adminRole') || 'Admin';
            await logActivity(
                `${adminName} (${adminRole})`,
                `Updated volunteer group: ${oldVolunteerData.groupName} - Changes: ${changes.join(', ')}`,
                'volunteer_management'
            );
        } catch (error) {
            console.error("Error updating volunteer group:", error);
        }
    };

    const handleVolunteerDelete = async (volunteerId, groupName) => {
        try {
            await deleteDoc(doc(db, "accredited_volunteers", volunteerId));
            
            // Log the activity
            const adminName = localStorage.getItem('adminName') || 'Admin';
            const adminRole = localStorage.getItem('adminRole') || 'Admin';
            await logActivity(
                `${adminName} (${adminRole})`,
                `Deleted volunteer group: ${groupName}`,
                'volunteer_management'
            );
        } catch (error) {
            console.error("Error deleting volunteer group:", error);
        }
    };

    const handleVolunteerClick = (volunteer) => {
        setSelectedVolunteer(volunteer);
        setIsVolunteerDetailsModalOpen(true);
    };

    // Filter volunteers
    const filteredVolunteers = volunteers.filter(volunteer => {
        return volunteerSearchTerm === "" || 
            (volunteer.groupName?.toLowerCase().includes(volunteerSearchTerm.toLowerCase()) ||
            volunteer.id?.toLowerCase().includes(volunteerSearchTerm.toLowerCase()));
    });

    return(
        <div className="min-h-screen bg-[#99c4e9] flex">
            {/* Dark overlay when any modal is open */}
            {(isAddTeamModalOpen || isTeamDetailsModalOpen || isPrivacyPolicyOpen || 
              isAddVolunteerModalOpen || isVolunteerDetailsModalOpen) && (
                <div className="fixed inset-0 bg-black/40 z-40" />
            )}

            <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar}/>

            <div className="flex-1 flex flex-col">
                {/*HEADER*/}
                <header className="bg-white w-full flex items-center justify-between px-3 py-4 shadow-md">
                    <div className="flex items-center space-x-2">
                        <button onClick={toggleSidebar}>
                            <img src="/images/menu.png" alt="Menu" className="w-[35px] h-[30px] cursor-pointer"/>
                        </button>
                        <img src="/images/logo.png" alt="Logo" className="w-[40px] h-[40px]"/>
                    </div>

                    <h1 className="text-[#1848a0] text-[28px] font-bold drop-shadow-md">
                       TEAM MANAGEMENT 
                    </h1>

                    <div className="flex items-center space-x-4">
                        <span className="text-black text-[17px] font-semibold">
                            {localStorage.getItem('adminRole') === 'superadmin' ? 'Superadmin' : localStorage.getItem('adminName')}
                        </span>
                        <img src="/images/user.png" alt="Profile" className="w-[40px] h-[40px]"/>
                    </div>
                </header>

                {/*MAIN*/}
                <main className="flex-grow px-10 py-6">
                    {/* RESCUE TEAMS SECTION */}
                    <div className="mb-8">
                        <h2 className="text-[#1848a0] text-2xl font-bold mb-4">Rescue Teams</h2>
                        
                        {/*FILTER*/}
                        <div className="bg-white border border-[#444444] rounded-[15px] p-4 flex flex-wrap items-center justify-between shadow-md">
                            <div className="flex items-center space-x-6">
                                <span className="font-bold text-[#444444] text-[16px]">Filter By:</span>

                                <select
                                    className="border border-[#0077B6] rounded-full px-6 py-1 text-[#444444] focus:outline-none focus:ring-2 focus:ring-[#0077B6]"
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                >
                                    <option value="">All Status</option>
                                    <option value="Standby">Standby</option>
                                    <option value="On Duty">On Duty</option>
                                </select>

                                <input
                                    type="text"
                                    placeholder="Search Team Name / ID"
                                    className="border border-[#0077b6] rounded-full px-4 py-1 w-[400px] focus:outline-none focus:ring-2 focus:ring-[#0077B6]"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>

                            {filterCount > 0 && (
                                <div className="flex items-center space-x-4">
                                    <span className="text-[#444444] text-sm">
                                        {filterCount} active filter{filterCount !== 1 ? 's' : ''}
                                    </span>
                                    <button
                                        onClick={clearFilters}
                                        className="text-[#0077B6] hover:text-[#005b8c] text-sm font-medium"
                                    >
                                        Clear Filters
                                    </button>
                                </div>
                            )}
                        </div>

                        {/*TEAM TABLE*/}
                        <div className="mt-6 rounded-[15px] overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="bg-[#1e3a5f] text-white text-[16px]">
                                        <th className="p-3 text-left">Team ID</th>
                                        <th className="p-3 text-left">Team Name</th>
                                        <th className="p-3 text-left">Contact Number</th>
                                        <th className="p-3 text-center">Number of Members</th>
                                        <th className="p-3 text-center">Assigned Request ID</th>
                                        <th className="p-3 text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white text-[#444444] text-[15px]">
                                    {filteredTeams.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" className="text-center py-6 text-gray-500">
                                                {teams.length === 0 ? "No teams available." : "No teams match your filters."}
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredTeams.map((team) => (
                                            <tr 
                                                key={team.id} 
                                                className="border hover:bg-gray-100 cursor-pointer"
                                                onClick={() => handleTeamClick(team)}
                                            >
                                                <td className="p-2 font-bold text-blue-600">#{team.id.slice(0, 6).toUpperCase()}</td>
                                                <td className="p-2">{team.teamName}</td>
                                                <td className="p-2">{team.contactNumber}</td>
                                                <td className="p-2 text-center">{team.memberCount || "N/A"}</td>
                                                <td className="p-2 text-center">
                                                    {team.requestID ? `#${team.requestID.slice(0, 6).toUpperCase()}` : "-"}
                                                </td>
                                                <td className="p-2 text-center">{team.status}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/*ADD TEAM BTN */}
                        <div className="flex justify-end mt-6">
                            <button
                                className="bg-[#1848a0] text-white px-6 py-2 rounded-[10px] font-semibold shadow-md hover:bg-[#163d8f] transition cursor-pointer"
                                onClick={() => setIsAddTeamModalOpen(true)}
                            >
                                + Add Team
                            </button>
                        </div>
                    </div>

                    {/* ACCREDITED VOLUNTEERS SECTION */}
                    <div>
                        <h2 className="text-[#1848a0] text-2xl font-bold mb-4">Accredited Volunteers</h2>
                        
                        {/*VOLUNTEER FILTER*/}
                        <div className="bg-white border border-[#444444] rounded-[15px] p-4 flex flex-wrap items-center justify-between shadow-md">
                            <div className="flex items-center space-x-6">
                                <span className="font-bold text-[#444444] text-[16px]">Search:</span>
                                <input
                                    type="text"
                                    placeholder="Search Volunteer Group / ID"
                                    className="border border-[#0077b6] rounded-full px-4 py-1 w-[400px] focus:outline-none focus:ring-2 focus:ring-[#0077B6]"
                                    value={volunteerSearchTerm}
                                    onChange={(e) => setVolunteerSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        {/*VOLUNTEER TABLE*/}
                        <div className="mt-6 rounded-[15px] overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="bg-[#1e3a5f] text-white text-[16px]">
                                        <th className="p-3 text-left">Group ID</th>
                                        <th className="p-3 text-left">Group Name</th>
                                        <th className="p-3 text-left">Leader Name</th>
                                        <th className="p-3 text-center">Number of Members</th>
                                        <th className="p-3 text-center">Date Accredited</th>
                                        <th className="p-3 text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white text-[#444444] text-[15px]">
                                    {filteredVolunteers.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" className="text-center py-6 text-gray-500">
                                                {volunteers.length === 0 ? "No volunteer groups available." : "No volunteer groups match your search."}
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredVolunteers.map((volunteer) => (
                                            <tr 
                                                key={volunteer.id} 
                                                className="border hover:bg-gray-100 cursor-pointer"
                                                onClick={() => handleVolunteerClick(volunteer)}
                                            >
                                                <td className="p-2 font-bold text-blue-600">#{volunteer.id.slice(0, 6).toUpperCase()}</td>
                                                <td className="p-2">{volunteer.groupName}</td>
                                                <td className="p-2">{volunteer.leaderName}</td>
                                                <td className="p-2 text-center">{volunteer.members?.length || 0}</td>
                                                <td className="p-2 text-center">
                                                    {volunteer.dateAccredited?.toDate().toLocaleDateString() || "N/A"}
                                                </td>
                                                <td className="p-2 text-center">{volunteer.status}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/*ADD VOLUNTEER BTN */}
                        <div className="flex justify-end mt-6">
                            <button
                                className="bg-[#1848a0] text-white px-6 py-2 rounded-[10px] font-semibold shadow-md hover:bg-[#163d8f] transition cursor-pointer"
                                onClick={() => setIsAddVolunteerModalOpen(true)}
                            >
                                + Add Volunteer Group
                            </button>
                        </div>
                    </div>
                </main>

                {/*Modals*/}
                <AddTeamModal
                    isOpen={isAddTeamModalOpen}
                    onClose={() => setIsAddTeamModalOpen(false)}
                    onSubmit={handleAddTeamSubmit}
                />

                <TeamDetailsModal
                    isOpen={isTeamDetailsModalOpen}
                    onClose={() => {
                        setIsTeamDetailsModalOpen(false);
                        setSelectedTeam(null);
                    }}
                    teamData={selectedTeam}
                    onUpdate={handleTeamUpdate}
                    onDelete={handleTeamDelete}
                />

                {/* New Volunteer Modals */}
                <AddVolunteerModal
                    isOpen={isAddVolunteerModalOpen}
                    onClose={() => setIsAddVolunteerModalOpen(false)}
                    onSubmit={handleAddVolunteerSubmit}
                />

                <VolunteerDetailsModal
                    isOpen={isVolunteerDetailsModalOpen}
                    onClose={() => {
                        setIsVolunteerDetailsModalOpen(false);
                        setSelectedVolunteer(null);
                    }}
                    volunteerData={selectedVolunteer}
                    onUpdate={handleVolunteerUpdate}
                    onDelete={handleVolunteerDelete}
                />

                {/*FOOTER*/}
                <footer className="bg-white w-full border-t border-black py-4 px-6 flex flex-col md:flex-row items-center justify-between text-[#444444] text-[14px] md:text-[18px]">
                    <span className="font-bold tracking-wide">RESQNECT | 2025</span>
                    <span className="text-center tracking-wide">Developed for Ormoc City Disaster Response</span>
                    <button 
                        className="font-bold tracking-wide cursor-pointer hover:text-[#1848A0] transition-colors"
                        onClick={() => setIsPrivacyPolicyOpen(true)}
                    >
                        Privacy Policy & Terms
                    </button>
                </footer>

                {/* Privacy Policy Modal */}
                <PrivacyPolicyModal
                    isOpen={isPrivacyPolicyOpen}
                    onClose={() => setIsPrivacyPolicyOpen(false)}
                />
            </div>
        </div>
    )
};

export default TeamManagementPage;