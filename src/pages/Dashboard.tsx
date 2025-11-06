import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, LogOut, Images, User, Settings, CreditCard, Palette } from "lucide-react";
import { GalleryCard } from "@/components/GalleryCard";
import { CreateGalleryDialog } from "@/components/CreateGalleryDialog";
import logo from "@/assets/logo.png";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface Gallery {
  id: string;
  title: string;
  gallery_type: string | null;
  wedding_date: string | null;
  slug: string;
  is_active: boolean;
  created_at: string;
  cover_image_path: string | null;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("");

  useEffect(() => {
    checkAuth();
    fetchGalleries();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const fetchGalleries = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      setUserEmail(user.email || "");

      const { data, error } = await supabase
        .from("galleries")
        .select("*")
        .eq("vendor_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setGalleries(data || []);
    } catch (error: any) {
      toast.error("Failed to load galleries");
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const handleGalleryCreated = () => {
    setShowCreateDialog(false);
    fetchGalleries();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Share My Shoot Logo" className="w-10 h-10 object-contain" />
            <h1 className="text-2xl font-serif">Share My Shoot</h1>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/10">
                    <User className="h-5 w-5 text-primary" />
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">My Account</p>
                  <p className="text-xs text-muted-foreground">{userEmail}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                <span>Account Settings</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/subscription')}>
                <CreditCard className="mr-2 h-4 w-4" />
                <span>Subscription</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Palette className="mr-2 h-4 w-4" />
                <span>Brand</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sign Out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-serif mb-2">Your Galleries</h2>
            <p className="text-muted-foreground">
              Create and manage your wedding photo galleries
            </p>
          </div>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Gallery
          </Button>
        </div>

        {galleries.length === 0 ? (
          <Card className="p-12 text-center gradient-card">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Images className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-serif mb-2">No galleries yet</h3>
              <p className="text-muted-foreground mb-6">
                Create your first gallery to start uploading wedding photos
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Gallery
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {galleries.map((gallery) => (
              <GalleryCard
                key={gallery.id}
                gallery={gallery}
                onUpdate={fetchGalleries}
              />
            ))}
          </div>
        )}
      </main>

      <CreateGalleryDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onGalleryCreated={handleGalleryCreated}
      />
    </div>
  );
};

export default Dashboard;
