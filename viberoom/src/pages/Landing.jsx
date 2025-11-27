import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useUser } from '@/hooks/use-user.js';
import { Video, Plus, LogIn, User as UserIcon, LogOut, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { api } from '@/lib/axios';

function Landing() {
  const [roomCode, setRoomCode] = useState('');
  const [roomTitle, setRoomTitle] = useState('');
  const [showProfile, setShowProfile] = useState(false);
  const [rooms, setRooms] = useState([]);
  const navigate = useNavigate();
  const { user, setUser } = useUser();

  // Fetch room history on load
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const res = await api.get('/api/v1/rooms/history');
        setRooms(res.data.data);
      } catch (err) {
        toast.error( err.message ||  "Unable to fetch room history.");
      }
    };
    fetchRooms();
  }, []);

  const createRoom = async () => {
    if(!roomTitle.trim()) {
      toast.error('Please enter a room title');
      return;
    }

    try {
      const res = await api.post('/api/v1/rooms/create', { title: roomTitle });
      const roomId = res.data.data.updatedRoom.roomCode;
      toast.success(`Room Created: ${roomId}`);
      navigate(`/rooms/${roomId}`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create room');
    }
  };

  const joinRoom = async () => {
    if (!roomCode.trim()) {
      toast.error('Please enter a room code');
      return;
    }
    try {
      await api.post(`/api/v1/rooms/join/${roomCode}`);
      navigate(`/rooms/${roomCode}`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Room not found');
    }
  };

  const deleteAllRooms = async () => {
    try {
      await api.delete('/api/v1/rooms/history/clear');
      setRooms([]);
      toast.success('All room history deleted');
    } catch (err) {
      toast.error( err.message || 'Failed to delete room history');
    }
  };

  const handleLogout = async () => {
    try {
      await api.post("/api/v1/users/logout");

      setUser(null);
      toast.success("Logged out successfully");
      navigate("/login");
      
    } catch (err) {
      toast.error(err.message || "Logout failed");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-card relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-secondary/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '1.5s' }} />
      </div>

      {/* Header */}
      <header className="relative z-10 p-6 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center shadow-glow">
            <Video className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            VibeRoom
          </h1>
        </div>
        <div className="flex gap-2 md:gap-3">
          <Button
            onClick={() => setShowProfile(true)}
            variant="outline"
            size="sm"
            className="bg-card/50 backdrop-blur-sm border-border hover:bg-card"
          >
            <UserIcon className="w-4 h-4 md:mr-2" />
            <span className="hidden md:inline">Profile</span>
          </Button>
          <Button
            onClick={handleLogout}
            variant="outline"
            size="sm"
            className="bg-card/50 backdrop-blur-sm border-border hover:bg-destructive hover:text-destructive-foreground"
          >
            <LogOut className="w-4 h-4 md:mr-2" />
            <span className="hidden md:inline">Logout</span>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 container mx-auto px-4 py-16">
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="text-5xl font-bold mb-4 bg-gradient-primary bg-clip-text text-transparent">
            Welcome, {user?.username}!
          </h2>
          <p className="text-xl text-muted-foreground">
            Start or join a viberoom in seconds
          </p>
        </div>

        {/* Main Actions */}
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-16">
          {/* Create Room Card */}
          <div className="bg-card/70 backdrop-blur-glass border border-border rounded-2xl p-8 shadow-glass hover:shadow-glow transition-all animate-scale-in">
            <div className="w-16 h-16 bg-gradient-primary rounded-xl flex items-center justify-center mb-6 shadow-glow">
              <Plus className="w-8 h-8 text-primary-foreground" />
            </div>
            <h3 className="text-2xl font-bold mb-2">Create Room</h3>
            <p className="text-muted-foreground mb-6">
              Start a new meeting and invite others
            </p>

            <div className="space-y-4">
              <Input
                placeholder="Enter room title"
                value={roomTitle}
                onChange={(e) => setRoomTitle(e.target.value)}
                className="bg-background/50 border-border focus:border-primary"
              />
              <Button
                onClick={createRoom}
                className="w-full bg-gradient-primary hover:opacity-90 text-primary-foreground py-6 rounded-xl shadow-glow"
              >
                Create New Room
              </Button>
            </div>
          </div>

          {/* Join Room Card */}
          <div className="bg-card/70 backdrop-blur-glass border border-border rounded-2xl p-8 shadow-glass hover:shadow-glow transition-all animate-scale-in" style={{ animationDelay: '0.1s' }}>
            <div className="w-16 h-16 bg-gradient-secondary rounded-xl flex items-center justify-center mb-6 shadow-glow">
              <LogIn className="w-8 h-8 text-primary-foreground" />
            </div>
            <h3 className="text-2xl font-bold mb-2">Join Room</h3>
            <p className="text-muted-foreground mb-6">
              Enter a room code to join a meeting
            </p>
            <div className="space-y-4">
              <Input
                placeholder="Enter room code"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value)}
                className="bg-background/50 border-border focus:border-primary"
              />
              <Button
                onClick={joinRoom}
                className="w-full bg-gradient-secondary hover:opacity-90 text-primary-foreground py-6 rounded-xl shadow-glow"
              >
                Join Room
              </Button>
            </div>
          </div>
        </div>

        {/* Room History */}
        {rooms.length > 0 ? (
          <div className="max-w-4xl mx-auto animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold">Your Rooms</h3>
              <Button
                onClick={deleteAllRooms}
                variant="outline"
                className="bg-card/50 backdrop-blur-sm border-border hover:bg-destructive hover:text-destructive-foreground"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete All
              </Button>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {rooms.map((room) => (
                <div
                  key={room.roomCode}
                  className="bg-card/70 backdrop-blur-glass border border-border rounded-xl p-6 shadow-glass hover:shadow-glow transition-all cursor-pointer"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-lg">{room.title}</h4>
                    <span className="text-xs text-muted-foreground">{new Date(room.createdAt).toDateString()}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Room Code: {room.roomCode}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-center text-muted-foreground">No room history yet.</p>
        )}
      </main>

      {/* Profile Modal */}
      <Dialog open={showProfile} onOpenChange={setShowProfile}>
        <DialogContent className="bg-card/95 backdrop-blur-glass border-border">
          <DialogHeader>
            <DialogTitle className="text-2xl">Your Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="flex flex-col items-center">
              <div className="w-24 h-24 bg-gradient-primary overflow-hidden rounded-full flex items-center justify-center text-4xl mb-4 shadow-glow">
                {user?.avatar?.startsWith('http') ? (
                  <img 
                    src={user.avatar} 
                    alt="profile avatar" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-4xl">{user?.avatar}</span>
                )}
              </div>
              <h3 className="text-xl font-semibold">{user?.username}</h3>
              <p className="text-muted-foreground">{user?.email}</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default Landing;
