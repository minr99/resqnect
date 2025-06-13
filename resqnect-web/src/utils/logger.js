import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";

export const logActivity = async (username, activity, type, ipAddress = null) => {
    try {
        await addDoc(collection(db, "logs"), {
            username,
            activity,
            type,
            ipAddress,
            timestamp: serverTimestamp()
        });
    } catch (error) {
        console.error("Error logging activity:", error);
    }
}; 