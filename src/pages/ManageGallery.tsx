import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Plus, Upload, Pencil, Images } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { SectionManager } from "@/components/SectionManager";
import { PhotoUploader } from "@/components/PhotoUploader";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Gallery {
  id: string;
  title: string;
  gallery_type: string | null;
  wedding_date: string | null;
  slug: string;
  is_active: boolean;
}

const GALLERY_TYPES = [
  "Adventure", "Anniversary", "Architecture", "Automotive", "Baby", "Baptism/Christening",
  "Bar/Bat Mitzvah", "Birth", "Birthday", "Boudoir", "Bridal", "Brit", "Business",
  "Children", "Christmas", "Commercial", "Concert", "Confirmation", "Couples", "Dance",
  "Editorial", "Elopement", "Engagement", "Equine", "Event", "Family", "Farewell",
  "Film", "First Communion", "Food", "General", "Graduation", "Headshots", "Holidays",
  "Interiors", "Landscape", "Lifestyle", "Live Music", "Look Book", "Maternity",
  "Milestones", "Mini Session", "Modeling", "Newborn", "Other", "Outdoor",
  "Passion Portrait", "Personal Branding", "Pets", "Photo Booth", "Portraits",
  "Pre-Wedding", "Products", "Proposal", "Quinceanera", "Real Estate",
  "Rehearsal Dinner", "Religious", "School", "Seniors", "Sport", "Styled Shoots",
  "Theater", "Travel", "Video", "Vow Renewal", "Wedding", "Workshop"
];

const ManageGallery = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [gallery, setGallery] = useState<Gallery | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editGalleryType, setEditGalleryType] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);

  useEffect(() => {
    checkAuth();
    if (id) {
      fetchGallery();
    }
  }, [id]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const fetchGallery = async () => {
    try {
      const { data, error } = await supabase
        .from("galleries")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      setGallery(data);
      setEditTitle(data.title);
      setEditGalleryType(data.gallery_type || "");
      setEditDate(data.wedding_date || "");
      setEditIsActive(data.is_active);
    } catch (error: unknown) {
      console.error("Error fetching gallery:", error);
      toast.error("Failed to load gallery");
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateGallery = async () => {
    if (!editTitle.trim()) {
      toast.error("Gallery title is required");
      return;
    }

    try {
      const { error } = await supabase
        .from("galleries")
        .update({
          title: editTitle,
          gallery_type: editGalleryType || null,
          wedding_date: editDate || null,
          is_active: editIsActive,
        })
        .eq("id", id);

      if (error) throw error;

      setGallery(prev => prev ? {
        ...prev,
        title: editTitle,
        gallery_type: editGalleryType || null,
        wedding_date: editDate || null,
        is_active: editIsActive,
      } : null);

      toast.success("Gallery updated successfully");
      setEditDialogOpen(false);
    } catch (error: unknown) {
      console.error("Error updating gallery:", error);
      toast.error("Failed to update gallery");
    }
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

  if (!gallery) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Images className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-2xl font-serif">Share My Shoot</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-3xl font-serif">{gallery.title}</h2>
              {gallery.gallery_type && (
                <p className="text-muted-foreground mt-1">{gallery.gallery_type}</p>
              )}
              {gallery.wedding_date && (
                <p className="text-muted-foreground text-sm">
                  {new Date(gallery.wedding_date).toLocaleDateString()}
                </p>
              )}
            </div>
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Pencil className="w-4 h-4 mr-2" />
                  Edit Details
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit Gallery Details</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Gallery Title</Label>
                    <Input
                      id="title"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      placeholder="Enter gallery title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gallery-type">Gallery Type</Label>
                    <Select value={editGalleryType} onValueChange={setEditGalleryType}>
                      <SelectTrigger id="gallery-type">
                        <SelectValue placeholder="Select gallery type" />
                      </SelectTrigger>
                      <SelectContent>
                        {GALLERY_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date">Wedding Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <div className="space-y-0.5">
                      <Label htmlFor="active-toggle">Gallery Status</Label>
                      <p className="text-sm text-muted-foreground">
                        {editIsActive ? "Gallery is visible to clients" : "Gallery is hidden from clients"}
                      </p>
                    </div>
                    <Switch
                      id="active-toggle"
                      checked={editIsActive}
                      onCheckedChange={setEditIsActive}
                    />
                  </div>
                  <Button onClick={handleUpdateGallery} className="w-full">
                    Save Changes
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-4">
            <Card className="p-6">
              <h2 className="text-xl font-serif mb-4">Gallery Sections</h2>
              <SectionManager
                galleryId={gallery.id}
                selectedSection={selectedSection}
                onSelectSection={setSelectedSection}
              />
            </Card>
            <Button
              variant="ghost"
              onClick={() => navigate("/dashboard")}
              className="w-full justify-start"
              size="sm"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>

          <div className="lg:col-span-2">
            {selectedSection ? (
              <PhotoUploader
                sectionId={selectedSection}
                galleryId={gallery.id}
              />
            ) : (
              <Card className="p-12 text-center gradient-card">
                <div className="max-w-md mx-auto">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Upload className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-serif mb-2">Select a section</h3>
                  <p className="text-muted-foreground">
                    Choose a section from the left to upload and manage photos
                  </p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default ManageGallery;
