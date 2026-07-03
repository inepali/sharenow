import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Upload, Pencil } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { SectionManager } from "@/components/SectionManager";
import { PhotoUploader } from "@/components/PhotoUploader";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AppHeader } from "@/components/layout/AppHeader";
import { useGallery } from "@/hooks/use-galleries";
import { useQueryClient } from "@tanstack/react-query";
import { GALLERY_TYPES } from "@/constants/gallery-types";

const ManageGallery = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: gallery, isLoading } = useGallery(id);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editGalleryType, setEditGalleryType] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);
  const [editPin, setEditPin] = useState("");

  const openEditDialog = () => {
    if (gallery) {
      setEditTitle(gallery.title);
      setEditGalleryType(gallery.gallery_type || "");
      setEditDate(gallery.wedding_date || "");
      setEditIsActive(gallery.is_active);
      setEditPin(gallery.access_pin || "");
      setEditDialogOpen(true);
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
          access_pin: editPin || null,
        })
        .eq("id", id);

      if (error) throw error;

      toast.success("Gallery updated successfully");
      setEditDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["gallery", id] });
    } catch (error: unknown) {
      console.error("Error updating gallery:", error);
      toast.error("Failed to update gallery");
    }
  };

  if (isLoading) {
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
      <AppHeader showUserMenu={false} />

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
                <Button variant="outline" size="sm" onClick={openEditDialog}>
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
                    <Label htmlFor="pin">Access PIN (4 Digits)</Label>
                    <Input
                      id="pin"
                      value={editPin}
                      onChange={(e) => setEditPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      placeholder="e.g. 1234"
                      maxLength={4}
                    />
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
