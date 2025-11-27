import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, Lock, User, Video, Smile, Upload, X } from 'lucide-react';
import { useUser } from '@/hooks/use-user.js';
import { api } from '@/lib/axios';


function Register() {
  const navigate = useNavigate();
  const { setUser } = useUser();

  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const [uploadedImage, setUploadedImage] = useState(null);
  const [preview, setPreview] = useState(null);



  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if(!file) return;

    if (file.size > 1 * 1024 * 1024) { // 1MB limit
      toast.error('File size exceeds 1MB limit.');
      return;
    }

    setUploadedImage(file);

    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result); // <--- THIS is the preview
    reader.readAsDataURL(file);
  };

  const removeUploadedImage = () => {
    setUploadedImage(null);
    setPreview(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.username || !formData.email || !formData.password || !formData.confirmPassword || !uploadedImage) {
      toast.error("All fields are required, including avatar.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords don't match!");
      return;
    }

    setIsLoading(true);

    try {

      const data = new FormData();
      data.append('username', formData.username);
      data.append('email', formData.email);
      data.append('password', formData.password);
      data.append('avatar', uploadedImage);

      const response = await api.post("/api/v1/users/register", data,{
        headers: {
          'Content-Type': 'multipart/form-data',
        }
      })

      toast.success( response.data.message || 'Registration successful!');

      setUser(response.data.user);
      navigate('/landing');

    } catch (err) {
      toast.error( err.response?.data?.message || 'Registration failed. Try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-card relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 right-20 w-72 h-72 bg-accent/20 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
      </div>

      <div className="w-full max-w-md relative z-10 animate-scale-in">
        {/* Glass card */}
        <div className="bg-card/70 backdrop-blur-glass border border-border rounded-2xl p-8 shadow-glass">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-gradient-secondary rounded-2xl flex items-center justify-center mb-4 shadow-glow">
              <Video className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-secondary bg-clip-text text-transparent">
              Create Account
            </h1>
            <p className="text-muted-foreground mt-2">Join us and start connecting</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-foreground">Username</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="username"
                  name="username"
                  type="text"
                  placeholder="Choose a username"
                  value={formData.username}
                  onChange={handleChange}
                  required
                  className="pl-10 bg-background/50 border-border focus:border-primary transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleChange}
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
                  name="password"
                  type="password"
                  placeholder="Create a password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="pl-10 bg-background/50 border-border focus:border-primary transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-foreground">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="Confirm password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  className="pl-10 bg-background/50 border-border focus:border-primary transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-foreground flex items-center gap-2">
                <Smile className="w-4 h-4" />
                Choose Your Avatar
              </Label>
              
              {/* Image Upload Section */}
              <div className="mb-4">
                {preview ? (
                  <div className="relative w-24 h-24 mx-auto">
                    <img
                      src={preview}
                      alt="Uploaded avatar"
                      className="w-full h-full rounded-full object-cover border-2 border-primary shadow-glow"
                    />
                    <button
                      type="button"
                      onClick={removeUploadedImage}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center hover:bg-destructive/90 transition-all"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex justify-center">
                    <label
                      htmlFor="avatar-upload"
                      className="cursor-pointer flex flex-col items-center gap-2 p-4 rounded-xl bg-background/50 border-2 border-dashed border-border hover:border-primary transition-all"
                    >
                      <Upload className="w-6 h-6 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Upload Image</span>
                      <span className="text-xs text-muted-foreground">(Max 1MB)</span>
                    </label>
                    <input
                      id="avatar-upload"
                      type="file"
                      name="avatar"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </div>
                )}
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-secondary hover:opacity-90 text-primary-foreground font-semibold py-6 rounded-xl shadow-glow transition-all"
            >
              {isLoading ? 'Creating account...' : 'Create Account'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-muted-foreground">
              Already have an account?{' '}
              <Link to="/login" className="text-primary hover:text-secondary transition-colors font-semibold">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;
