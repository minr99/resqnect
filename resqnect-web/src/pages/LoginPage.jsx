import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { db } from "../firebase/firebaseConfig";
import { collection, query, where, getDocs, doc, updateDoc } from "firebase/firestore";
import bcrypt from "bcryptjs";
import { logActivity } from "../utils/logger";

function LoginPage() {
    const navigate = useNavigate();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [timeLeft, setTimeLeft] = useState({});
    const [isFirstLogin, setIsFirstLogin] = useState(false);
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState({
        password: "",
        confirmPassword: ""
    });

    // Check lockout status for all usernames
    useEffect(() => {
        const checkLockouts = () => {
            const lockoutTime = JSON.parse(localStorage.getItem('lockoutTime') || '{}');
            const now = Date.now();
            const newTimeLeft = {};
            
            Object.entries(lockoutTime).forEach(([user, time]) => {
                if (time > now) {
                    newTimeLeft[user] = Math.ceil((time - now) / 1000);
                }
            });
            
            setTimeLeft(newTimeLeft);
        };

        const interval = setInterval(checkLockouts, 1000);
        return () => clearInterval(interval);
    }, []);

    const handleFailedAttempt = async (username) => {
        const loginAttempts = JSON.parse(localStorage.getItem('loginAttempts') || '{}');
        const newAttempts = { ...loginAttempts };
        newAttempts[username] = (newAttempts[username] || 0) + 1;
        localStorage.setItem('loginAttempts', JSON.stringify(newAttempts));

        // Log failed login attempt
        await logActivity(username, "Failed login attempt", "login");

        if (newAttempts[username] >= 3) {
            const lockoutTime = JSON.parse(localStorage.getItem('lockoutTime') || '{}');
            lockoutTime[username] = Date.now() + (15 * 60 * 1000); // 15 minutes
            localStorage.setItem('lockoutTime', JSON.stringify(lockoutTime));
            setError(`Too many failed attempts. Please try again in 15 minutes.`);
        } else {
            setError(`Invalid username or password. ${3 - newAttempts[username]} attempts remaining.`);
        }
    };

    const handleFirstLoginPasswordChange = async (e) => {
        e.preventDefault();
        
        if (newPassword.password !== newPassword.confirmPassword) {
            setError("New passwords do not match!");
            return;
        }

        try {
            // Verify current password
            const adminRef = collection(db, "admins");
            const q = query(adminRef, where("username", "==", username));
            const querySnapshot = await getDocs(q);
            const adminDoc = querySnapshot.docs[0];
            const adminData = adminDoc.data();

            const isCurrentPasswordValid = await bcrypt.compare(currentPassword, adminData.password);

            if (!isCurrentPasswordValid) {
                setError("Current password is incorrect!");
                return;
            }

            // Update password and first login status
            const hashedPassword = await bcrypt.hash(newPassword.password, 10);
            await updateDoc(doc(db, "admins", adminDoc.id), {
                password: hashedPassword,
                isFirstLogin: false
            });

            // Reset attempts for this username
            const loginAttempts = JSON.parse(localStorage.getItem('loginAttempts') || '{}');
            const lockoutTime = JSON.parse(localStorage.getItem('lockoutTime') || '{}');
            delete loginAttempts[username];
            delete lockoutTime[username];
            localStorage.setItem('loginAttempts', JSON.stringify(loginAttempts));
            localStorage.setItem('lockoutTime', JSON.stringify(lockoutTime));

            // Store admin data in localStorage
            localStorage.setItem('userType', 'admin');
            localStorage.setItem('adminRole', adminData.role || 'admin');
            localStorage.setItem('adminName', adminData.name || 'Admin');
            
            setIsLoading(false);
            window.location.href = "/emergency-assistance";
        } catch (error) {
            console.error("Error changing password:", error);
            setError("Failed to change password. Please try again.");
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        // Check if this specific username is locked out
        const lockoutTime = JSON.parse(localStorage.getItem('lockoutTime') || '{}');
        if (lockoutTime[username] > Date.now()) {
            const minutesLeft = Math.ceil((lockoutTime[username] - Date.now()) / (60 * 1000));
            setError(`Too many failed attempts. Please try again in ${minutesLeft} minutes.`);
            setIsLoading(false);
            return;
        }

        try { 
            // First check admin login
            const adminRef = collection(db, "admins");
            const q = query(adminRef, where("username", "==", username));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                const adminDoc = querySnapshot.docs[0];
                const adminData = adminDoc.data();

                const isAdminPasswordValid = await bcrypt.compare(password, adminData.password);

                if (isAdminPasswordValid) {
                    // Check if admin is deactivated
                    if (adminData.status === "inactive") {
                        await logActivity(username, "Failed login attempt - Account deactivated", "login");
                        setError("This account has been deactivated. Please contact the superadmin for assistance.");
                        setIsLoading(false);
                        return;
                    }

                    // Check if this is first login
                    if (adminData.isFirstLogin) {
                        setIsFirstLogin(true);
                        setIsLoading(false);
                        return;
                    }

                    // Reset attempts for this username only
                    const loginAttempts = JSON.parse(localStorage.getItem('loginAttempts') || '{}');
                    const lockoutTime = JSON.parse(localStorage.getItem('lockoutTime') || '{}');
                    delete loginAttempts[username];
                    delete lockoutTime[username];
                    localStorage.setItem('loginAttempts', JSON.stringify(loginAttempts));
                    localStorage.setItem('lockoutTime', JSON.stringify(lockoutTime));
                    
                    // Store admin data in localStorage
                    localStorage.setItem('userType', 'admin');
                    localStorage.setItem('adminRole', adminData.role || 'admin');
                    localStorage.setItem('adminName', adminData.name || 'Admin');
                    
                    // Log successful admin login
                    await logActivity(username, "Successful admin login", "login");
                    
                    setIsLoading(false);
                    window.location.href = "/emergency-assistance";
                    return;
                } else {
                    handleFailedAttempt(username);
                    setIsLoading(false);
                    return;
                }
            }

            // If not admin, check barangay login
            const barangayRef = collection(db, "barangays");
            const brgyQuery = query(barangayRef, where("username", "==", username));
            const brgySnapshot = await getDocs(brgyQuery);

            if (!brgySnapshot.empty) {
                const userDoc = brgySnapshot.docs[0];
                const userData = userDoc.data();

                const isBrgyPasswordValid = await bcrypt.compare(password, userData.password);
                if (!isBrgyPasswordValid) {
                    handleFailedAttempt(username);
                    setIsLoading(false);
                    return;
                }

                if (userData.status === "active") {
                    // Reset attempts for this username only
                    const loginAttempts = JSON.parse(localStorage.getItem('loginAttempts') || '{}');
                    const lockoutTime = JSON.parse(localStorage.getItem('lockoutTime') || '{}');
                    delete loginAttempts[username];
                    delete lockoutTime[username];
                    localStorage.setItem('loginAttempts', JSON.stringify(loginAttempts));
                    localStorage.setItem('lockoutTime', JSON.stringify(lockoutTime));
                    setIsLoading(false);
                    
                    // Store barangay data in localStorage
                    localStorage.setItem('barangayId', userDoc.id);
                    localStorage.setItem('barangayName', userData.barangayName);
                    localStorage.setItem('userType', 'barangay');
                    
                    // Log successful barangay login
                    await logActivity(username, "Successful barangay login", "login");
                    
                    // Use navigate with state for barangay login
                    navigate('/assistance', {
                        state: {
                            barangayId: userDoc.id,
                            barangayName: userData.barangayName
                        }
                    });
                    return;
                } else if (userData.status === "pending") {
                    await logActivity(username, "Failed login attempt - Account pending", "login");
                    setError("Your account is not yet confirmed. Please wait for admin approval.");
                    setIsLoading(false);
                } else if (userData.status === "archived") {
                    await logActivity(username, "Failed login attempt - Account archived", "login");
                    setError("This account has been archived. Please contact the administrator for assistance.");
                    setIsLoading(false);
                }
            } else {
                handleFailedAttempt(username);
                setIsLoading(false);
            }
        } catch (err) {
            console.error("Login error:", err);
            setError("Something went wrong. Please try again.");
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col lg:flex-row items-center justify-center w-full bg-gradient-to-t from-[#38A2FF] to-[#99C4E9] min-h-screen p-6">
            
            {/* Logo Section */}
            <div className="relative flex flex-col items-center lg:absolute lg:top-[200px] lg:left-[312px] lg:w-[304px] lg:h-[334px]">
                <img src="/images/logo.png" alt="RESQNECT Logo" className="w-[180px] md:w-[220px] lg:w-[304px]" />
                <h1 className="text-[60px] md:text-[80px] lg:text-[90px] font-bold text-[#1848A0] drop-shadow-lg font-[Poppins]">
                    RESQNECT
                </h1>
                <p className="text-[18px] md:text-[22px] lg:text-[24px] text-[#444444] font-semibold">
                    Disaster Response Platform
                </p>
            </div>

            {/* Login Form */}
            <div className="relative w-full bg-white max-w[488px] p-6 drop-shadow-lg rounded-lg mt-10 lg:mt-0 lg:absolute lg:left-[846px] lg:top-[200px] lg:w-[488px] lg:h-[500px]">
                {isFirstLogin ? (
                    <form onSubmit={handleFirstLoginPasswordChange}>
                        <h2 className="text-2xl font-bold text-[#1e3a5f] mb-6">Change Password Required</h2>
                        <p className="text-gray-600 mb-4">This is your first login. Please change your password for security.</p>
                        
                        {error && (
                            <div className="text-red-500 text-center mb-4">
                                {error}
                            </div>
                        )}

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Current Password</label>
                                <input 
                                    type="password" 
                                    required 
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" 
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">New Password</label>
                                <input 
                                    type="password" 
                                    required 
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" 
                                    value={newPassword.password}
                                    onChange={(e) => setNewPassword({...newPassword, password: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Confirm New Password</label>
                                <input 
                                    type="password" 
                                    required 
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" 
                                    value={newPassword.confirmPassword}
                                    onChange={(e) => setNewPassword({...newPassword, confirmPassword: e.target.value})}
                                />
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            className={`w-full h-[50px] rounded-md drop-shadow-lg cursor-pointer font-bold text-[18px] text-white mt-6 ${
                                isLoading ? 'bg-gray-400' : 'bg-[#1848A0] hover:bg-[#143D88]'
                            }`}
                            disabled={isLoading}
                        >
                            {isLoading ? 'Changing Password...' : 'Change Password'}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleLogin}>
                        {/* Error Message */}
                        {error && (
                            <div className="text-red-500 text-center mb-4 lg:absolute lg:top-[20px] lg:left-[22px] lg:w-[442px]">
                                {error}
                            </div>
                        )}

                        {/* Username Input */}
                        <input 
                            type="text" 
                            placeholder="Enter Username" 
                            className="w-full h-[50px] rounded-md border-2 border-[#CCCCCC] text-[#1848A0] font-bold text-[18px] px-4 placeholder-[#1848A0] lg:absolute lg:left-[22px] lg:top-[70px] lg:w-[442px]"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            disabled={isLoading}
                        />

                        {/* Password Input */}
                        <input 
                            type="password" 
                            placeholder="Enter Password" 
                            className="w-full h-[50px] rounded-md border-2 border-[#CCCCCC] text-[#1848A0] font-bold text-[18px] placeholder-[#1848A0] px-4 mt-4 lg:absolute lg:left-[22px] lg:top-[140px] lg:w-[442px]"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            disabled={isLoading}
                        />

                        {/* Required Fields Note */}
                        <div className="text-red-500 text-sm mt-2 lg:absolute lg:top-[200px] lg:left-[22px] lg:w-[442px]">
                            * Username and password are required fields
                        </div>

                        {/* Forgot Password & Register Buttons */}
                        <div className="relative w-full">

                            <button 
                                type="submit" 
                                className={`w-full lg:w-[442px] h-[50px] rounded-md drop-shadow-lg cursor-pointer font-bold text-[18px] text-white mt-4 lg:mt-0 lg:absolute lg:top-[250px] ${
                                    isLoading ? 'bg-gray-400' : 'bg-[#1848A0] hover:bg-[#143D88]'
                                }`}
                                disabled={isLoading}
                            >
                                {isLoading ? 'Logging in...' : 'Login'}
                            </button>

                            <button 
                                type="button" 
                                className="w-full lg:w-[442px] h-[50px] bg-white rounded-md drop-shadow-lg cursor-pointer font-bold text-[18px] text-[#1848A0] border border-[#999999] mt-4 lg:mt-0 lg:absolute lg:top-[320px]"
                                onClick={() => navigate("/register")}
                            >
                                Register
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}

export default LoginPage;
