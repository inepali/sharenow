import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Gallery } from "@/types";

async function fetchGalleries(): Promise<Gallery[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("galleries")
    .select("*")
    .eq("vendor_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

async function fetchGallery(id: string): Promise<Gallery> {
  const { data, error } = await supabase
    .from("galleries")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

export function useGalleries() {
  return useQuery({
    queryKey: ["galleries"],
    queryFn: fetchGalleries,
  });
}

export function useGallery(id: string | undefined) {
  return useQuery({
    queryKey: ["gallery", id],
    queryFn: () => fetchGallery(id!),
    enabled: !!id,
  });
}

export function useUserEmail() {
  return useQuery({
    queryKey: ["userEmail"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user?.email || "";
    },
  });
}

export function useInvalidateGalleries() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["galleries"] });
}
