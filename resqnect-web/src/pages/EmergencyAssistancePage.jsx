import React, { useEffect, useState, useRef } from "react";
import RequestAssistanceModal from "../components/RequestAssistanceModal";
import Sidebar from "../components/Sidebar";
import PrivacyPolicyModal from "../components/PrivacyPolicyModal";
import { db } from "../firebase/firebaseConfig";
import { collection, onSnapshot, query, where, getDocs } from "firebase/firestore";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Bell } from "lucide-react";

const EmergencyAssistancePage = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [requests, setRequests] = useState([]);
    const [barangays, setBarangays] = useState([]);
    const [isPrivacyPolicyOpen, setIsPrivacyPolicyOpen] = useState(false);
    const [adminName, setAdminName] = useState("");
    const [adminRole, setAdminRole] = useState("");
    
    // Filter states
    const [requestTypeFilter, setRequestTypeFilter] = useState("");
    const [priorityFilter, setPriorityFilter] = useState("");
    const [barangayFilter, setBarangayFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    
    const [newRequestNotif, setNewRequestNotif] = useState(false);
    const lastTimestampRef = useRef(null);
    const audioContextRef = useRef(null);
    const audioBufferRef = useRef(null);
    const sourceNodeRef = useRef(null);

    // Get admin information from localStorage
    useEffect(() => {
        const storedAdminName = localStorage.getItem('adminName');
        const storedAdminRole = localStorage.getItem('adminRole');
        setAdminName(storedAdminName || 'Admin');
        setAdminRole(storedAdminRole || 'admin');
    }, []);

    // Initialize audio context and load sound
    useEffect(() => {
        const initAudio = async () => {
            try {
                // Create audio context
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                audioContextRef.current = new AudioContext();

                // Load the audio file
                const response = await fetch('/sounds/emergency-alarm-with-reverb-29431.mp3');
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const arrayBuffer = await response.arrayBuffer();
                audioBufferRef.current = await audioContextRef.current.decodeAudioData(arrayBuffer);
                console.log('Audio loaded successfully');
            } catch (error) {
                console.error('Error initializing audio:', error);
            }
        };

        initAudio();

        return () => {
            if (sourceNodeRef.current) {
                sourceNodeRef.current.stop();
            }
            if (audioContextRef.current) {
                audioContextRef.current.close();
            }
        };
    }, []);

    // Function to play notification sound
    const playNotificationSound = async () => {
        try {
            if (!audioContextRef.current || !audioBufferRef.current) {
                console.error('Audio context or buffer not initialized');
                return;
            }

            // Resume audio context if it's suspended
            if (audioContextRef.current.state === 'suspended') {
                await audioContextRef.current.resume();
            }

            // Stop any existing sound
            if (sourceNodeRef.current) {
                sourceNodeRef.current.stop();
            }

            // Create new source node
            const source = audioContextRef.current.createBufferSource();
            source.buffer = audioBufferRef.current;
            source.connect(audioContextRef.current.destination);
            source.loop = true;
            source.start(0);
            sourceNodeRef.current = source;
            console.log('Notification sound started playing');
        } catch (error) {
            console.error('Error playing notification sound:', error);
        }
    };

    // Function to stop notification sound
    const stopNotificationSound = () => {
        if (sourceNodeRef.current) {
            sourceNodeRef.current.stop();
            sourceNodeRef.current = null;
        }
    };

    // Handle bell icon click
    const handleBellClick = () => {
        setNewRequestNotif(false);
        stopNotificationSound();
    };

    // Request notification permission
    useEffect(() => {
        const requestNotificationPermission = async () => {
            try {
                if ('Notification' in window) {
                    const permission = await Notification.requestPermission();
                    if (permission === 'granted') {
                        console.log('Notification permission granted');
                    }
                }
            } catch (error) {
                console.error('Error requesting notification permission:', error);
            }
        };

        requestNotificationPermission();
    }, []);

    // Fetch approved barangays
    useEffect(() => {
        const fetchBarangays = async () => {
            try {
                const q = query(
                    collection(db, "barangays"),
                    where("status", "==", "active")
                );
                const querySnapshot = await getDocs(q);
                const barangayData = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setBarangays(barangayData);
            } catch (error) {
                console.error("Error fetching barangays:", error);
            }
        };
        fetchBarangays();
    }, []);

    useEffect(() => {
        const q = query(
            collection(db, "assistance_request"),
            where("status", "==", "Forwarded to CDRRMO")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const forwardedRequests = [];
            let latestTimestamp = lastTimestampRef.current;

            snapshot.docs.forEach((doc) => {
                const data = doc.data();
                const requestTime = data.timestamp?.toDate();
                forwardedRequests.push({ id: doc.id, ...data });

                // Check if this is the initial load and there are pending requests
                if (!lastTimestampRef.current && data.adminStatus === "Pending") {
                    setNewRequestNotif(true);
                    playNotificationSound();
                }

                if (requestTime && (!latestTimestamp || requestTime > latestTimestamp)) {
                    if (lastTimestampRef.current) {
                        // Show browser notification if permission is granted
                        if ('Notification' in window && Notification.permission === 'granted') {
                            new Notification('New Emergency Request', {
                                body: 'A new forwarded request has been received!',
                                icon: '/images/logo.png'
                            });
                        }

                        toast.info("New Forwarded Request Received!", {
                            position: "top-right",
                            autoClose: 4000,
                            hideProgressBar: false,
                            closeOnClick: true,
                            pauseOnHover: true,
                            draggable: true,
                        });
                        setNewRequestNotif(true);
                        playNotificationSound();
                    }
                    latestTimestamp = requestTime;
                }
            });

            forwardedRequests.sort((a, b) => b.timestamp?.toDate() - a.timestamp?.toDate());
            setRequests(forwardedRequests);
            lastTimestampRef.current = latestTimestamp;
        });

        return () => unsubscribe();
    }, []);

    // Filter requests based on all criteria
    const filteredRequests = requests.filter(request => {
        const matchesType = !requestTypeFilter || request.assistanceType === requestTypeFilter;
        const matchesPriority = !priorityFilter || request.priority === priorityFilter;
        const matchesBarangay = !barangayFilter || request.barangay === barangayFilter;
        const matchesStatus = !statusFilter || request.adminStatus === statusFilter;
        const matchesSearch = !searchTerm || 
            request.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            request.fullName?.toLowerCase().includes(searchTerm.toLowerCase());

        return matchesType && matchesPriority && matchesBarangay && matchesStatus && matchesSearch;
    });

    const handleOpenModal = (request) => {
        setSelectedRequest(request);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedRequest(null);
    };

    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
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

    return (
        <div className="min-h-screen bg-[#99C4E9] flex">
            {/* Dark overlay when any modal is open */}
            {(isModalOpen || isPrivacyPolicyOpen) && (
                <div className="fixed inset-0 bg-black/40 z-40" />
            )}
            
            {/* Sidebar Component */}
            <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />

            {/* Main Content */}
            <div className="flex-1 flex flex-col">
                {/* HEADER */}
                <header className="bg-white w-full flex items-center justify-between px-3 py-4 shadow-md">
                    <div className="flex items-center space-x-2">
                        {/* Menu Button */}
                        <button onClick={toggleSidebar}>
                            <img src="/images/menu.png" alt="Menu" className="w-[35px] h-[30px] cursor-pointer" />
                        </button>
                        <img src="/images/logo.png" alt="Logo" className="w-[40px] h-[40px]" />
                    </div>

                    <h1 className="text-[#1848a0] text-[28px] font-bold drop-shadow-md">
                        EMERGENCY ASSISTANCE MANAGEMENT
                    </h1>

                    <div className="flex items-center space-x-4">
                        <button className="relative" onClick={handleBellClick} title="New Request Notification">
                            <Bell className="w-6 h-6 text-[#1848a0]"/>
                            {newRequestNotif && (
                                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-600 rounded-full animate-ping"/>
                            )}
                        </button>
                        <span className="text-black text-[17px] font-semibold">{adminRole === 'superadmin' ? 'Superadmin' : adminName}</span>
                        <img src="/images/user.png" alt="Profile" className="w-[40px] h-[40px]" />
                    </div>
                </header>

                {/* MAIN CONTENT */}
                <main className="flex-grow px-10 py-6">
                    {/* FILTER */}
                    <div className="bg-white border border-[#444444] rounded-[15px] p-4 flex flex-wrap items-center space-x-8 shadow-md">
                        <span className="font-bold text-[#444444] text-[16px]">Filter By:</span>
                        
                        <select 
                            className="border border-[#0077B6] rounded-full px-7 text-[#444444]"
                            value={requestTypeFilter}
                            onChange={(e) => setRequestTypeFilter(e.target.value)}
                        >
                            <option value="">All Request Types</option>
                            <option value="Medical Assistance">Medical Assistance</option>
                            <option value="Resource Assistance">Resource Assistance</option>
                            <option value="Emergency Assistance">Emergency Assistance</option>
                        </select>

                        <select 
                            className="border border-[#0077B6] rounded-full px-7 text-[#444444]"
                            value={priorityFilter}
                            onChange={(e) => setPriorityFilter(e.target.value)}
                        >
                            <option value="">All Priorities</option>
                            <option value="High">High</option>
                            <option value="Moderate">Moderate</option>
                            <option value="Low">Low</option>
                        </select>

                        <select 
                            className="border border-[#0077B6] rounded-full px-7 text-[#444444]"
                            value={barangayFilter}
                            onChange={(e) => setBarangayFilter(e.target.value)}
                        >
                            <option value="">All Barangays</option>
                            {barangays.map((brgy) => (
                                <option key={brgy.id} value={brgy.barangayName}>
                                    {brgy.barangayName}
                                </option>
                            ))}
                        </select>

                        <select 
                            className="border border-[#0077B6] rounded-full px-7 text-[#444444]"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="">All Status</option>
                            <option value="Pending">Pending</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Completed">Completed</option>
                        </select>

                        <input 
                            type="text" 
                            placeholder="Search Request ID or Name" 
                            className="border border-[#0077B6] rounded-full px-4 w-[400px]"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {/* REQUEST TABLE */}
                    <div className="mt-6 rounded-[15px] h-[550px] overflow-y-scroll bg-white shadow-md">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-[#1E3A5F] text-white">
                                    <th className="p-3">Request ID</th>
                                    <th className="p-3">Resident Location</th>
                                    <th className="p-3">Assistance Type</th>
                                    <th className="p-3">Priority</th>
                                    <th className="p-3">Request Status</th>
                                    <th className="p-3">Date and Time</th>
                                    <th className="p-3">Assigned Team</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white text-[#444444]">
                                {filteredRequests.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="text-center py-6 text-gray-500">
                                            No forwarded requests found.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredRequests.map((request) => (
                                        <tr
                                            key={request.id}
                                            className="border cursor-pointer hover:bg-gray-100"
                                            onClick={() => handleOpenModal(request)}
                                        >
                                            <td className="p-2 text-center text-blue-600 font-bold hover:underline">
                                                #{request.id.slice(0, 6).toUpperCase()}
                                            </td>
                                            <td className="p-2 text-center">{request.address || "N/A"}</td>
                                            <td className="p-2 text-center">{request.assistanceType || "N/A"}</td>
                                            <td className={`p-2 text-center font-bold ${request.priority === "High" ? "text-red-600" : request.priority === "Moderate" ? "text-yellow-600" : request.priority === "Low" ? "text-green-600" : "text-green-500"}`}>{request.priority || "N/A"}</td>
                                            <td className="p-2 text-center">{request.adminStatus}</td>
                                            <td className="p-2 text-center">{request.timestamp?.toDate().toLocaleString() || "N/A"}</td>
                                            <td className="p-2 text-center">{request.assignedTeam || "No Assigned"}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </main>

                {/* FOOTER */}
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

                {/* MODAL */}
                <RequestAssistanceModal
                    isOpen={isModalOpen}
                    onClose={handleCloseModal}
                    requestData={selectedRequest || {}}
                />

                {/* Privacy Policy Modal */}
                <PrivacyPolicyModal
                    isOpen={isPrivacyPolicyOpen}
                    onClose={() => setIsPrivacyPolicyOpen(false)}
                />

                <ToastContainer/>
            </div>
        </div>
    );
};

export default EmergencyAssistancePage;
