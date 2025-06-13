import React from "react";

const PrivacyPolicyModal = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 flex items-center justify-center z-50">
            <div className="bg-white w-[90%] max-w-[1000px] max-h-[90vh] rounded-[20px] border border-[#444444] shadow-lg p-8 relative overflow-y-auto">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-6 text-2xl text-[#444444] hover:text-black cursor-pointer"
                >
                    &times;
                </button>

                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-[#1848A0] mb-2">PRIVACY POLICY & TERMS OF SERVICE</h1>
                    <p className="text-[#444444]">Official Document of the City Disaster Risk Reduction and Management Office</p>
                </div>

                <div className="space-y-8">
                    <section>
                        <h2 className="text-xl font-bold text-[#1848A0] mb-4">Privacy Policy</h2>
                        <p className="text-[#444444] mb-4">
                            At RESQNECT, we are committed to protecting your personal data and ensuring transparency in how your information is collected and used. This policy outlines how we collect, use, store, and protect your data in accordance with applicable data protection laws.
                        </p>

                        <div className="space-y-4">
                            <div>
                                <h3 className="font-bold text-[#444444] mb-2">1. Information We Collect</h3>
                                <p className="text-[#444444]">We collect only the necessary information to support effective disaster preparedness and emergency response:</p>
                                <ul className="list-disc pl-6 mt-2 text-[#444444]">
                                    <li>Full name, contact number, and barangay affiliation of residents</li>
                                    <li>Assistance request details including category, location, and timestamp</li>
                                    <li>Barangay and rescue team identification and contact details</li>
                                    <li>Device identifiers for improving app functionality and service delivery</li>
                                </ul>
                            </div>

                            <div>
                                <h3 className="font-bold text-[#444444] mb-2">2. Purpose of Data Collection</h3>
                                <p className="text-[#444444]">The data collected is used exclusively for the following purposes:</p>
                                <ul className="list-disc pl-6 mt-2 text-[#444444]">
                                    <li>Coordinating and managing emergency assistance requests</li>
                                    <li>Verifying and validating users for security and operational accuracy</li>
                                    <li>Assigning and tracking response teams</li>
                                    <li>Improving service quality and system monitoring</li>
                                </ul>
                            </div>

                            <div>
                                <h3 className="font-bold text-[#444444] mb-2">3. Data Storage and Security</h3>
                                <ul className="list-disc pl-6 text-[#444444]">
                                    <li>All data is securely stored in encrypted databases (Firebase and MongoDB)</li>
                                    <li>Access is strictly limited to authorized system users (i.e., barangay officials, administrators, and rescue personnel)</li>
                                    <li>The system follows strict data access protocols and employs safeguards to prevent unauthorized access, loss, or misuse</li>
                                </ul>
                            </div>

                            <div>
                                <h3 className="font-bold text-[#444444] mb-2">4. Data Retention and Deletion</h3>
                                <ul className="list-disc pl-6 text-[#444444]">
                                    <li>User data will be retained only for as long as necessary to fulfill the system's operational goals</li>
                                    <li>Residents may formally request deletion of their data if they choose to discontinue using the platform</li>
                                </ul>
                            </div>

                            <div>
                                <h3 className="font-bold text-[#444444] mb-2">5. Data Sharing</h3>
                                <ul className="list-disc pl-6 text-[#444444]">
                                    <li>RESQNECT does not sell, trade, or share your personal data with any third parties</li>
                                    <li>Your information will only be shared internally with verified personnel for legitimate response and coordination purposes</li>
                                </ul>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-[#1848A0] mb-4">Terms and Conditions of Use</h2>
                        <p className="text-[#444444] mb-4">By using RESQNECT, you agree to the following terms and responsibilities:</p>

                        <div className="space-y-4">
                            <div>
                                <h3 className="font-bold text-[#444444] mb-2">1. System Usage Eligibility</h3>
                                <p className="text-[#444444]">This system is exclusively designed for:</p>
                                <ul className="list-disc pl-6 mt-2 text-[#444444]">
                                    <li>Verified residents of Ormoc City</li>
                                    <li>Authorized barangay rescue teams</li>
                                    <li>Official disaster response administrators</li>
                                </ul>
                            </div>

                            <div>
                                <h3 className="font-bold text-[#444444] mb-2">2. User Responsibilities</h3>
                                <ul className="list-disc pl-6 text-[#444444]">
                                    <li>Residents must provide truthful information and use the platform solely for emergency, medical, or resource-based assistance</li>
                                    <li>Barangay and admin users must handle requests with diligence, integrity, and confidentiality</li>
                                    <li>Misuse of the platform may result in restricted access or legal accountability</li>
                                </ul>
                            </div>

                            <div>
                                <h3 className="font-bold text-[#444444] mb-2">3. Account and Access Management</h3>
                                <ul className="list-disc pl-6 text-[#444444]">
                                    <li>Resident registration is a one-time process per device; no repeated logins are required</li>
                                    <li>Barangay and admin users are required to maintain the confidentiality of their login credentials and avoid unauthorized account sharing</li>
                                </ul>
                            </div>

                            <div>
                                <h3 className="font-bold text-[#444444] mb-2">4. Maintenance and System Updates</h3>
                                <ul className="list-disc pl-6 text-[#444444]">
                                    <li>The system may undergo updates to enhance performance or address security issues</li>
                                    <li>Users will be notified in advance of significant updates that may affect system usage or data handling</li>
                                </ul>
                            </div>

                            <div>
                                <h3 className="font-bold text-[#444444] mb-2">5. Amendments</h3>
                                <p className="text-[#444444]">
                                    RESQNECT reserves the right to revise this policy and the terms of service as necessary. Any changes will be communicated via the mobile app or official website.
                                </p>
                            </div>
                        </div>
                    </section>
                </div>

                <div className="mt-8 text-center">
                    <button
                        onClick={onClose}
                        className="bg-[#1848A0] text-white px-8 py-2 rounded-lg hover:bg-[#163d8f] transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PrivacyPolicyModal; 