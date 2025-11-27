// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import UserProvider from "./context/UserContext.jsx";
import {useUser} from "./hooks/use-user.js";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Landing from "./pages/Landing.jsx";
import Room from "./pages/Room.jsx";
import NotFound from "./pages/NotFound.jsx";

// Create a client for React Query
const queryClient = new QueryClient();

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading} = useUser();

  if (loading){
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="w-12 h-12 border-4 border-t-transparent border-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <UserProvider>
          <Toaster />
          <BrowserRouter>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Navigate to="/login" />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              
              {/* Protected routes */}
              <Route
                path="/landing"
                element={
                  <ProtectedRoute>
                    <Landing />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/rooms/:roomId"
                element={
                  <ProtectedRoute>
                    <Room />
                  </ProtectedRoute>
                }
              />
              
              {/* 404 route */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </UserProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;