import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUser } from "@/hooks/use-user.js";
import { Mail, Lock, Video } from "lucide-react";
import { api } from "@/lib/axios";


function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();
  const { getUserProfile, isAuthenticated, loading } = useUser();

  useEffect(() => {
    if(isAuthenticated && !loading){
      navigate("/landing");
    }
  }, [isAuthenticated, loading, navigate]);

  const handleLogin= async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await api.post("/api/v1/users/login", { email, password },{
          headers: { "Content-Type": "application/json" },
        }
      );

      await getUserProfile();

      toast.success("Welcome back!");
      navigate("/landing");

    } catch (error) {
      toast.error(
        error.response?.data?.message || "Login failed. Please try again."
      );

    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-card relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-20 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-float" />
        <div
          className="absolute bottom-20 right-20 w-96 h-96 bg-secondary/20 rounded-full blur-3xl animate-float"
          style={{ animationDelay: "1s" }}
        />
      </div>

      <div className="w-full max-w-md relative z-10 animate-scale-in">
        <div className="bg-card/70 backdrop-blur-glass border border-border rounded-2xl p-8 shadow-glass">

          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center mb-4 shadow-glow">
              <Video className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Welcome Back
            </h1>
            <p className="text-muted-foreground mt-2">
              Sign in to continue to your meetings
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="pl-10 bg-background/50 border-border focus:border-primary transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pl-10 bg-background/50 border-border focus:border-primary transition-all"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-primary hover:opacity-90 text-primary-foreground font-semibold py-6 rounded-xl shadow-glow transition-all"
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-muted-foreground">
              Don't have an account?{" "}
              <Link to="/register" className="text-primary hover:text-secondary transition-colors font-semibold">
                Register
              </Link>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}

export default Login;
