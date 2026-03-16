import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Plus, FolderOpen, Trash2 } from "lucide-react";

interface Section {
  id: string;
  title: string;
  display_order: number;
}

interface SectionManagerProps {
  galleryId: string;
  selectedSection: string | null;
  onSelectSection: (id: string | null) => void;
}

export const SectionManager = ({
  galleryId,
  selectedSection,
  onSelectSection,
}: SectionManagerProps) => {
  const [sections, setSections] = useState<Section[]>([]);
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSections();
  }, [galleryId]);

  const fetchSections = async () => {
    const { data, error } = await supabase
      .from("sections")
      .select("*")
      .eq("gallery_id", galleryId)
      .order("display_order", { ascending: true });

    if (error) {
      toast.error("Failed to load sections");
    } else {
      setSections(data || []);
      if (data && data.length > 0 && !selectedSection) {
        onSelectSection(data[0].id);
      }
    }
  };

  const handleAddSection = async () => {
    if (!newSectionTitle.trim()) {
      toast.error("Please enter a section title");
      return;
    }

    setLoading(true);

    const maxOrder = sections.reduce((max, s) => Math.max(max, s.display_order), -1);

    const { error } = await supabase
      .from("sections")
      .insert({
        gallery_id: galleryId,
        title: newSectionTitle.trim(),
        display_order: maxOrder + 1,
      });

    if (error) {
      toast.error("Failed to create section");
    } else {
      toast.success("Section created");
      setNewSectionTitle("");
      fetchSections();
    }

    setLoading(false);
  };

  const handleDeleteSection = async (id: string) => {
    if (!confirm("Delete this section and all its photos?")) return;

    setLoading(true);

    try {
      // 1. Fetch all photos for this section
      const { data: photos, error: fetchError } = await supabase
        .from("photos")
        .select("storage_path")
        .eq("section_id", id);

      if (fetchError) throw fetchError;

      // 2. Delete photos from R2
      if (photos && photos.length > 0) {
        const fileNames = photos.map(p => p.storage_path);
        const { error: edgeError } = await supabase.functions.invoke('r2-delete-object', {
          body: { fileNames }
        });

        if (edgeError) {
          console.error("Failed to delete photos from R2:", edgeError);
          toast.error("Warning: Some photos could not be deleted from storage");
        }
      }

      // 3. Delete section from database (photos will be cascade deleted or trigger deleted)
      const { error: dbError } = await supabase
        .from("sections")
        .delete()
        .eq("id", id);

      if (dbError) throw dbError;

      toast.success("Section deleted");
      if (selectedSection === id) {
        onSelectSection(null);
      }
      fetchSections();
    } catch (error) {
      console.error("Error deleting section:", error);
      toast.error("Failed to delete section");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Input
          placeholder="New section name"
          value={newSectionTitle}
          onChange={(e) => setNewSectionTitle(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && handleAddSection()}
        />
        <Button
          onClick={handleAddSection}
          disabled={loading}
          className="w-full"
          size="sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Section
        </Button>
      </div>

      <div className="space-y-2">
        {sections.map((section) => (
          <div
            key={section.id}
            className={`flex items-center justify-between p-3 rounded-lg border transition-smooth cursor-pointer ${selectedSection === section.id
                ? "bg-primary/10 border-primary"
                : "hover:bg-muted"
              }`}
            onClick={() => onSelectSection(section.id)}
          >
            <div className="flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-primary" />
              <span className="font-medium">{section.title}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteSection(section.id);
              }}
            >
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};
