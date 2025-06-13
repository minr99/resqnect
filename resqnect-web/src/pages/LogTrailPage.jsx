import React, { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import { db } from "../firebase/firebaseConfig";
import { collection, onSnapshot, query, orderBy, where } from "firebase/firestore";
import PrivacyPolicyModal from "../components/PrivacyPolicyModal";

const LogTrailPage = () => {
    //sidebar toggle
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isPrivacyPolicyOpen, setIsPrivacyPolicyOpen] = useState(false);

    //storing data
    const [logs, setLogs] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");

    //sidebar function
    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    //real-time listener for logs
    useEffect(() => {
        //query to get logs ordered by timestamp
        const logsQuery = query(
            collection(db, "logs"),
            orderBy("timestamp", "desc")
        );

        const unsubscribe = onSnapshot(logsQuery, (snapshot) => {
            const logData = snapshot.docs.map((doc) => ({
                id: doc.id, ...doc.data(),
            }));
            setLogs(logData);
        }, (error) => {
            console.error("Error fetching logs:", error);
        });

        return () => unsubscribe();
    }, []);

    //filter logs
    const filteredLogs = logs.filter((log) => {
        return log.username?.toLowerCase().includes(searchTerm.toLowerCase()) || 
               log.activity?.toLowerCase().includes(searchTerm.toLowerCase());
    });

    //format timestamp
    const formatTimestamp = (timestamp) => {
        if (!timestamp) return "N/A";
        const date = timestamp.toDate();
        return date.toLocaleString();
    };

    return (
        <div className="min-h-screen bg-[#99c4e9] flex">
            <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar}/>

            <div className="flex-1 flex flex-col">
                {/*Header*/}
                <header className="bg-white w-full flex items-center justify-between px-3 py-4 shadow-md">
                    <div className="flex items-center space-x-2">
                        <button onClick={toggleSidebar}>
                            <img src="/images/menu.png" alt="Menu" className="w-[35px] h-[30px] cursor-pointer"/>
                        </button>
                        <img src="/images/logo.png" alt="Logo" className="w-[40px] h-[40px]"/>
                    </div>
                    <h1 className="text-[#1848a0] text-[28px] font-bold drop-shadow-md">
                        LOG TRAIL / AUDIT LOGS
                    </h1>
                    <div className="flex items-center space-x-4">
                        <span className="text-black text-[17px] font-semibold">
                            {localStorage.getItem('adminRole') === 'superadmin' ? 'Superadmin' : localStorage.getItem('adminName')}
                        </span>
                        <img src="/images/user.png" alt="Profile" className="w-[40px] h-[40px]"/>
                    </div>
                </header>

                {/*Content*/}
                <main className="flex-grow px-10 py-6 space-y-6">
                    {/*Search Bar*/}
                    <div className="bg-white border border-[#444444] rounded-[15px] p-4 flex items-center gap-4 shadow-md">
                        <span className="font-bold text-[#444444] text-[16px]">Search:</span>
                        <input
                            type="text"
                            placeholder="Search by username or activity"
                            className="border border-[#0077b6] rounded-full px-4 py-1 w-[300px] text-[#444444]"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {/*Logs Table*/}
                    <div className="bg-white border border-[#444444] rounded-[15px] shadow-md">
                        <div className="max-h-[500px] overflow-y-auto">
                            <table className="w-full border-collapse">
                                <thead className="sticky top-0 bg-[#1e3a5f]">
                                    <tr className="text-white">
                                        <th className="p-3 text-center">Timestamp</th>
                                        <th className="p-3 text-center">Username</th>
                                        <th className="p-3 text-center">Type</th>
                                        <th className="p-3 text-center">Activity</th>
                                    </tr>
                                </thead>
                                <tbody className="text-[#444444] bg-white">
                                    {filteredLogs.map((log) => (
                                        <tr key={log.id} className="border-t hover:bg-gray-100">
                                            <td className="p-3 text-center">
                                                {formatTimestamp(log.timestamp)}
                                            </td>
                                            <td className="p-3 text-center font-semibold">
                                                {log.username}
                                            </td>
                                            <td className="p-3 text-center">
                                                <span
                                                    className={`px-3 py-1 rounded-full text-sm font-semibold ${log.type === "login" ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800"}`}
                                                >
                                                    {log.type}
                                                </span>
                                            </td>
                                            <td className="p-3 text-center">
                                                {log.activity}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </main>

                {/* Footer */}
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

export default LogTrailPage;