import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { db, storage } from "../firebase/firebaseConfig";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import Sidebar_brgy from "../components/Sidebar_brgy";
import bcrypt from "bcryptjs"; // import bcryptjs
import { Eye, EyeOff } from "lucide-react"; // optional icon package
import PrivacyPolicyModal from "../components/PrivacyPolicyModal";
import { logActivity } from "../utils/logger";

const ChangePasswordModal = ({ isOpen, onClose, onSave, loading }) => {
    // State for password fields
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    
    // State for password visibility toggles
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Function to clear all form data
    const clearFormData = () => {
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setError("");
    };

    // Function to handle modal close
    const handleClose = () => {
        clearFormData();
        onClose();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        // Validate if passwords match
        if (newPassword !== confirmPassword) {
            setError("New passwords do not match!");
            return;
        }

        // Validate password strength
        const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
        if (!passwordRegex.test(newPassword)) {
            setError("Password must be at least 8 characters and include both letters and numbers.");
            return;
        }

        // Only proceed with save if there are no errors
        if (!error) {
            onSave(currentPassword, newPassword);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0x flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg w-full max-w-md">
                <h2 className="text-xl font-bold text-[#1848A0] mb-4">Change Password</h2>
                {error && <p className="text-red-500 mb-4">{error}</p>}
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-[#444444] font-semibold mb-2">Current Password</label>
                        <div className="relative">
                            <input
                                type={showCurrentPassword ? "text" : "password"}
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                className="w-full border border-[#0077B6] rounded-full px-4 py-2"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                className="absolute right-3 top-2.5"
                            >
                                {showCurrentPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                    </div>
                    <div className="mb-4">
                        <label className="block text-[#444444] font-semibold mb-2">New Password</label>
                        <div className="relative">
                            <input
                                type={showNewPassword ? "text" : "password"}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full border border-[#0077B6] rounded-full px-4 py-2"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowNewPassword(!showNewPassword)}
                                className="absolute right-3 top-2.5"
                            >
                                {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                    </div>
                    <div className="mb-6">
                        <label className="block text-[#444444] font-semibold mb-2">Confirm New Password</label>
                        <div className="relative">
                            <input
                                type={showConfirmPassword ? "text" : "password"}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full border border-[#0077B6] rounded-full px-4 py-2"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-3 top-2.5"
                            >
                                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="bg-gray-400 hover:bg-gray-500 text-white font-semibold px-5 py-2 rounded-full"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || error}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2 rounded-full"
                        >
                            {loading ? "Saving..." : "Save"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const BarangayProfilePage = () => {
    const location = useLocation();
    const navigate = useNavigate();

    const barangayId = location.state?.barangayId;
    const barangayName = location.state?.barangayName;

    const [barangayData, setBarangayData] = useState(null);
    const [editMode, setEditMode] = useState(false);
    const [formData, setFormData] = useState({});
    const [newProofFile, setNewProofFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false); // toggle visibility
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
    const [changePasswordLoading, setChangePasswordLoading] = useState(false);
    const [isPrivacyPolicyOpen, setIsPrivacyPolicyOpen] = useState(false);

    useEffect(() => {
        if (!barangayId) {
            alert("Unauthorized access. Please log in again.");
            navigate("/login");
        }
    }, [barangayId, navigate]);

    useEffect(() => {
        const fetchData = async () => {
            if (!barangayId) return;
            try {
                const docRef = doc(db, "barangays", barangayId);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setBarangayData(docSnap.data());
                    setFormData(docSnap.data());
                } else {
                    alert("Barangay data not found.");
                    navigate("/assistance");
                }
            } catch (error) {
                console.error("Error fetching barangay data:", error);
            }
        };
        fetchData();
    }, [barangayId, navigate]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e) => {
        setNewProofFile(e.target.files[0]);
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            let proofURL = formData.proofURL;

            if (newProofFile) {
                if (proofURL) {
                    const oldImageRef = ref(storage, proofURL);
                    await deleteObject(oldImageRef);
                }

                const storageRef = ref(storage, `proofs/${barangayId}`);
                await uploadBytes(storageRef, newProofFile);
                proofURL = await getDownloadURL(storageRef);
            }

            // Check if password has changed before hashing
            let updatedPassword = formData.password;
            if (formData.password !== barangayData.password) {
                const salt = await bcrypt.genSalt(10);
                updatedPassword = await bcrypt.hash(formData.password, salt);
            }

            // Track changes for logging
            const changes = [];
            if (formData.barangayName !== barangayData.barangayName) changes.push("barangay name");
            if (formData.captainName !== barangayData.captainName) changes.push("captain name");
            if (formData.barangayContact !== barangayData.barangayContact) changes.push("barangay contact");
            if (formData.username !== barangayData.username) changes.push("username");
            if (formData.teamContact !== barangayData.teamContact) changes.push("team contact person");
            if (formData.teamContactNumber !== barangayData.teamContactNumber) changes.push("team contact number");
            if (newProofFile) changes.push("proof of legitimacy");

            const updatedData = {
                ...formData,
                password: updatedPassword,
                proofURL,
            };

            await updateDoc(doc(db, "barangays", barangayId), updatedData);

            // Log the activity if there were changes
            if (changes.length > 0) {
                await logActivity(
                    barangayName,
                    `Updated barangay information: ${changes.join(", ")}`,
                    "barangay_management"
                );
            }

            const docRef = doc(db, "barangays", barangayId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                setBarangayData(docSnap.data());
                setFormData(docSnap.data());
            } else {
                alert("Barangay data not found.");
                navigate("/assistance");
            }

            setEditMode(false);
            setNewProofFile(null);
            alert("Profile updated successfully!");
        } catch (error) {
            console.error("Update error:", error);
            alert("Failed to update profile.");
        }
        setLoading(false);
    };

    const handleCancel = () => {
        setFormData(barangayData);
        setEditMode(false);
        setNewProofFile(null);
    };

    const handleChangePassword = async (currentPassword, newPassword) => {
        setChangePasswordLoading(true);
        try {
            // Verify current password
            const isMatch = await bcrypt.compare(currentPassword, barangayData.password);
            if (!isMatch) {
                setChangePasswordLoading(false);
                alert("Current password is incorrect!");
                return;
            }

            // Hash new password
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(newPassword, salt);

            // Update password in database
            await updateDoc(doc(db, "barangays", barangayId), {
                password: hashedPassword
            });

            // Log the activity
            await logActivity(
                barangayName,
                "Changed barangay account password",
                "barangay_management"
            );

            // Update local state
            setBarangayData(prev => ({ ...prev, password: hashedPassword }));
            setFormData(prev => ({ ...prev, password: hashedPassword }));

            setShowChangePasswordModal(false);
            alert("Password updated successfully!");
        } catch (error) {
            console.error("Error changing password:", error);
            alert("Failed to change password. Please try again.");
        } finally {
            setChangePasswordLoading(false);
        }
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            const sidebar = document.getElementById("sidebar-brgy");
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

    if (!barangayData) return <p className="text-center mt-10 text-[#444444]">Loading profile...</p>;

    return (
        <div className="min-h-screen bg-[#99C4E9] flex">
            <Sidebar_brgy isOpen={isSidebarOpen} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} barangayId={barangayId} barangayName={barangayName} />
            <div className="flex-1 flex flex-col">
                <header className="bg-white w-full flex items-center justify-between px-3 py-4 shadow-md">
                    <div className="flex items-center space-x-2">
                        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                            <img src="/images/menu.png" alt="Menu" className="w-[35px] h-[30px] cursor-pointer" />
                        </button>
                        <img src="/images/logo.png" alt="Logo" className="w-[40px] h-[40px]" />
                    </div>
                    <h1 className="text-[#1848a0] text-[28px] font-bold drop-shadow-md">BARANGAY PROFILE</h1>
                    <div className="flex items-center space-x-4">
                        <span className="text-black text-[17px] font-semibold">{barangayName}</span>
                        <img src="/images/user.png" alt="Profile" className="w-[40px] h-[40px]" />
                    </div>
                </header>

                <main className="flex-grow px-10 py-6">
                    <div className="bg-white border border-[#444444] rounded-[15px] p-4 shadow-md">
                        <h2 className="font-bold text-[#444444] text-[16px] mb-4">Barangay Information</h2>
                        <div className="grid grid-cols-2 gap-4 text-[#444444]">
                            {[
                                { label: "Barangay Name", name: "barangayName" },
                                { label: "Captain Name", name: "captainName" },
                                { label: "Barangay Contact", name: "barangayContact" },
                                { label: "Username", name: "username" },
                                { label: "Team Contact Person", name: "teamContact" },
                                { label: "Team Contact Number", name: "teamContactNumber" },
                            ].map((field) => (
                                <div key={field.name}>
                                    <label className="font-semibold">{field.label}</label>
                                    <input
                                        type="text"
                                        name={field.name}
                                        value={formData[field.name] || ""}
                                        onChange={handleChange}
                                        className="border border-[#0077B6] rounded-full px-7 py-2 w-full"
                                        readOnly={!editMode}
                                    />
                                </div>
                            ))}
                        </div>

                        <div className="mt-6">
                            <label className="font-semibold text-[#444444]">Proof of Legitimacy</label>
                            <div className="mt-2">
                                <img
                                    src={newProofFile ? URL.createObjectURL(newProofFile) : formData.proofURL}
                                    alt="Proof"
                                    className="w-full max-h-[300px] object-contain border rounded"
                                />
                                {editMode && (
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                        className="mt-3 border border-[#0077B6] rounded-full px-4 py-2 w-full"
                                    />
                                )}
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end gap-3">
                            {!editMode ? (
                                <>
                                    <button 
                                        onClick={() => setShowChangePasswordModal(true)} 
                                        className="bg-[#1848A0] hover:bg-[#143D88] text-white font-semibold px-5 py-2 rounded-full"
                                    >
                                        Change Password
                                    </button>
                                    <button 
                                        onClick={() => setEditMode(true)} 
                                        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2 rounded-full"
                                    >
                                        Edit
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        onClick={handleSave}
                                        disabled={loading}
                                        className="bg-green-600 hover:bg-green-700 text-white font-semibold px-5 py-2 rounded-full"
                                    >
                                        {loading ? "Saving..." : "Save"}
                                    </button>
                                    <button onClick={handleCancel} className="bg-gray-400 hover:bg-gray-500 text-white font-semibold px-5 py-2 rounded-full">
                                        Cancel
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </main>

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
            </div>

            <ChangePasswordModal
                isOpen={showChangePasswordModal}
                onClose={() => setShowChangePasswordModal(false)}
                onSave={handleChangePassword}
                loading={changePasswordLoading}
            />

            <PrivacyPolicyModal
                isOpen={isPrivacyPolicyOpen}
                onClose={() => setIsPrivacyPolicyOpen(false)}
            />
        </div>
    );
};

export default BarangayProfilePage;
