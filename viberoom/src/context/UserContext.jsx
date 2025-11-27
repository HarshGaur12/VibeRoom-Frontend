import { useState, useEffect } from "react";
import { UserContext } from "./useContext.js";
import { api } from "@/lib/axios.js";
import { toast } from "sonner";

export default function UserProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const getUserProfile = async () =>{
        try {
            const {data} = await api.get("/api/v1/users/auth/me");
            setUser(data.data);
        } catch (err) {
            if(err.response?.status !== 401){
                toast.error(err.message || "Failed to fetch user profile");
            }
            setUser(null);   
        } finally {
            setLoading(false);
        }

    };

    useEffect(() =>{
        getUserProfile();
    }, []);


    const isAuthenticated = !!user;

    return (
        <UserContext.Provider value={{
            user,
            setUser,
            isAuthenticated,
            loading,
            getUserProfile
        }}>
            {!loading && children}
        </UserContext.Provider>
    );
};
