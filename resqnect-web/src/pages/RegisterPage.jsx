import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import app from "../firebase/firebaseConfig";
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getFirestore, collection, addDoc } from "firebase/firestore";
import bcrypt from "bcryptjs";

const LoadingModal = () => (
    <div className="fixed inset-0 flex items-center justify-center z-50">
        <div className="bg-white max-w-md w-full p-6 rounded-xl shadow-lg text-center relative">
            <img src="/images/logo.png" alt="Logo" className="w-[80px] mx-auto mb-4" />
            <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1848A0] mb-4"></div>
                <p className="text-[#333]">Processing your registration...</p>
            </div>
        </div>
    </div>
);

const Modal = ({ message, onClose, isSuccess }) => (
    <div className="fixed inset-0 flex items-center justify-center z-50">
        <div className="bg-white max-w-md w-full p-6 rounded-xl shadow-lg text-center relative">
            <img src="/images/logo.png" alt="Logo" className="w-[80px] mx-auto mb-4" />
            <h3 className={`text-lg font-semibold mb-3 ${isSuccess ? "text-green-600" : "text-red-600"}`}>
                {isSuccess ? "Registration Submitted!" : "Oops!"}
            </h3>
            <p className="text-[#333] mb-6">{message}</p>
            <button
                onClick={onClose}
                className="bg-[#1848A0] hover:bg-[#143D88] text-white font-bold px-6 py-2 rounded-md"
            >
                OK
            </button>
        </div>
    </div>
);

const Register = () => {
    const [barangayName, setBarangayName] = useState("");
    const [captainName, setCaptainName] = useState("");
    const [barangayContact, setBarangayContact] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [teamContact, setTeamContact] = useState("");
    const [teamContactNumber, setTeamContactNumber] = useState("");
    const [error, setError] = useState("");
    const [proofFile, setProofFile] = useState(null);
    const [isConfirmed, setIsConfirmed] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [ModalMessage, setModalMessage] = useState("");
    const [isSuccess, setIsSuccess] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const navigate = useNavigate();

    const validatePhoneNumber = (number) => {
        const phoneRegex = /^09\d{9}$/;
        return phoneRegex.test(number);
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setError("");
        
        if (password !== confirmPassword) {
            setError("Passwords do not match!");
            return;
        }

        if(!proofFile){
            setError("Please upload proof of legitimacy.");
            return;
        }

        if(!isConfirmed) {
            setError("Please confirm that the information is correct.");
            return;
        }

        // Validate contact numbers
        if (!validatePhoneNumber(barangayContact)) {
            setError("Invalid Barangay Contact Number format. Must be 09XX-XXX-XXXX");
            return;
        }

        if (!validatePhoneNumber(teamContactNumber)) {
            setError("Invalid Team Contact Number format. Must be 09XX-XXX-XXXX");
            return;
        }

        // Show loading state
        setIsLoading(true);

        try{
            const storage = getStorage(app);
            const storageRef = ref(storage, `proofs/${Date.now()}_${proofFile.name}`);
            await uploadBytes(storageRef,proofFile);
            const downloadURL = await getDownloadURL(storageRef);

            const db = getFirestore(app);

            const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
            if (!passwordRegex.test(password)) {
                setError("Password must be at least 8 characters and include both letters and numbers.");
                setIsLoading(false);
                return;
            }

            const salt = bcrypt.genSaltSync(10);
            const hashedPassword = bcrypt.hashSync(password, salt);

            const registrationData = {
                barangayName,
                captainName,
                barangayContact,
                username,
                password: hashedPassword,
                teamContact,
                teamContactNumber,
                proofURL: downloadURL,
                timestamp: new Date(),
                status: "pending",
            };

            await addDoc(collection(db, "barangays"), registrationData);

            // Hide loading and show success
            setIsLoading(false);
            setIsSuccess(true);
            setModalMessage("Your barangay registration request has been successfully submitted. Our team will review your application, and you will be notified once approved. This may take up to 24-48 hours. If you have urgent concerns, please contact the Main Rescue Team.");
            setShowModal(true);

            //navigate("/");
        } catch(err){
            console.error("Error during registration:", err);
            
            // Hide loading and show error
            setIsLoading(false);
            setIsSuccess(false);
            setModalMessage("Something went wrong, please try again.");
            setShowModal(true);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center w-full bg-gradient-to-t from-[#38A2FF] to-[#99C4E9] min-h-screen p-6">
            {isLoading && <LoadingModal />}
            {showModal && (
                <Modal
                    message={ModalMessage}
                    isSuccess={isSuccess}
                    onClose={() => {
                        setShowModal(false);
                        if(isSuccess) {
                            navigate("/");
                        }
                    }}
                />
            )}
            <div className="relative flex flex-col items-center mt-6 lg:mt-0">
                <img src="/images/logo.png" alt="RESQNECT Logo" className="w-[180px] md:w-[220px] lg:w-[304px]"/>
                <h1 className="text-[60px] md:text-[80px] lg:text-[90px] font-bold text-[#1848A0] drop-shadow-lg font-[Poppins]">RESQNECT</h1>
                <p className="text-[18px] md:text-[22px] lg:text-[24px] text-[#444444] font-semibold">Disaster Response Platform</p>
            </div>

            <div className="bg-white max-w-[600px] w-full p-8 rounded-lg drop-shadow-lg mt-10">
                <h2 className="text-2xl font-bold text-[#1848A0] mb-4 text-center">Barangay Registration</h2>
                
                {error && <p className="text-red-500 text-center">{error}</p>}
                <form className="grid grid-cols-1 gap-4" onSubmit={handleRegister}>
                    <div>
                        <label className="text-[16px] font-semibold text-[#333]">Barangay Name: <span className="text-red-500">*</span></label>
                        <input type="text" value={barangayName} onChange={(e) => setBarangayName(e.target.value)}
                            className="w-full h-[45px] border-2 border-[#CCCCCC] rounded-md px-4 text-[#1848A0] font-semibold" required/>
                    </div>

                    <div>
                        <label className="text-[#333] text-[16px] font-semibold">Barangay Captain Name: <span className="text-red-500">*</span></label>
                        <input type="text" value={captainName} onChange={(e) => setCaptainName(e.target.value)} 
                            className="border-[#CCCCCC] w-full border-2 h-[45px] rounded-md px-4 text-[#1848A0] font-semibold" required/>
                    </div>

                    <div>
                        <label className="text-[#333] text-[16px] font-semibold">Official Barangay Contact Number: <span className="text-red-500">*</span></label>
                        <input type="text" value={barangayContact} onChange={(e) => setBarangayContact(e.target.value)}
                            placeholder="09XX-XXX-XXXX"
                            className="border-[#CCCCCC] border-2 w-full h-[45px] px-4 rounded-md text-[#1848A0] font-semibold" required/>
                        <p className="text-[13px] text-gray-600 mt-1">Enter a valid Philippine mobile number starting with 09</p>
                    </div>

                    <div>
                        <label className="text-[#333] text-[16px] font-semibold">Username: <span className="text-red-500">*</span></label>
                        <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                            className="border-[#CCCCCC] border-2 w-full h-[45px] rounded-md px-4 text-[#1848A0] font-semibold" required/>
                    </div>

                    <div>
                        <label className="text-[#333] font-semibold text-[16px]">Password: <span className="text-red-500">*</span></label>
                        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                            className="border-[#CCCCCC] border-2 w-full h-[45px] rounded-md px-4 text-[#1848A0] font-semibold" required/>
                        <p className="text-[13px] text-gray-600 mt-1">Password must be at least 8 characters and include both letters and numbers</p>
                    </div>

                    <div>
                        <label className="text-[#333] font-semibold text-[16px]">Confirm Password: <span className="text-red-500">*</span></label>
                        <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                            className="border-2 border-[#CCCCCC] w-full h-[45px] rounded-md px-4 text-[#1848A0] font-semibold" required/>
                    </div>

                    <div>
                        <label className="text-[#333] font-semibold text-[16px]">Team Contact Person: <span className="text-red-500">*</span></label>
                        <input type="text" value={teamContact} onChange={(e) => setTeamContact(e.target.value)}
                            className="border-2 border-[#CCCCCC] w-full h-[45px] rounded-md px-4 text-[#1848A0] font-semibold" required/>
                    </div>

                    <div>
                        <label className="text-[#333] font-semibold text-[16px]">Team Contact Person's Number: <span className="text-red-500">*</span></label>
                        <input type="text" value={teamContactNumber} onChange={(e) => setTeamContactNumber(e.target.value)}
                            placeholder="09XX-XXX-XXXX"
                            className="border-2 border-[#CCCCCC] w-full h-[45px] rounded-md px-4 text-[#1848A0] font-semibold" required/>
                        <p className="text-[13px] text-gray-600 mt-1">Enter a valid Philippine mobile number starting with 09</p>
                    </div>
                    <div>
                        <label className="text-[16px] font-semibold text-[#333]">Upload Proof of Legitimacy: <span className="text-red-500">*</span></label>
                        <input type="file" accept=".jpg,.png,.pdf" onChange={(e) => setProofFile(e.target.files[0])} className="w-full border-2 border-[#CCCCCC] rounded-md p-2"/>
                    </div>

                    <div className="flex space-between gap-2 mt-2">
                        <input
                            type="checkbox"
                            id="confirmation"
                            checked={isConfirmed}
                            onChange={() => setIsConfirmed(!isConfirmed)}
                            className="mt-1"
                            required
                        />

                        <label htmlFor="confirmation" className="text-[#333] text-[15px]">
                            I confirm that this information is correct. <span className="text-red-500">*</span>
                        </label>
                    </div>

                    <div className="text-sm text-red-500 mt-2">
                        <span className="font-semibold">*</span> Required fields
                    </div>

                    <div className="flex justify-between mt-4">
                        <button type="button" className="w-[48%] h-[50px] bg-white text-[#1848A0] font-bold text-[18px] border border-[#999999] rounded-md shadow-md hover:bg-gray-200 cursor-pointer"
                        onClick={() => navigate("/")}>
                            Cancel
                        </button>
                        <button type="submit" className="w-[48%] h-[50px] bg-[#1848A0] text-white font-bold text-[18px] rounded-md shadow-md hover:bg-[#143D88] cursor-pointer">
                            Register
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Register;
