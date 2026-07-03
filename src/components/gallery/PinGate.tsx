import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock } from "lucide-react";
import { toast } from "sonner";

interface PinGateProps {
  galleryId: string;
  accessPin: string;
  onVerified: () => void;
}

export const PinGate = ({ galleryId, accessPin, onVerified }: PinGateProps) => {
  const [pinInput, setPinInput] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === accessPin) {
      sessionStorage.setItem(`gallery_pin_${galleryId}`, pinInput);
      onVerified();
      toast.success("Access granted");
    } else {
      toast.error("Incorrect PIN");
      setPinInput("");
    }
  };

  return (
    <main className="container mx-auto px-4 py-24 flex items-center justify-center">
      <Card className="p-8 max-w-md w-full text-center gradient-card shadow-lg">
        <Lock className="w-12 h-12 text-primary mx-auto mb-6" />
        <h2 className="text-2xl font-serif mb-2">Private Gallery</h2>
        <p className="text-muted-foreground mb-8">
          Please enter the 4-digit PIN provided by your photographer to view these photos.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="password"
            placeholder="Enter 4-digit PIN"
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
            className="text-center text-xl tracking-widest h-14"
            maxLength={4}
            required
          />
          <Button type="submit" className="w-full h-12 text-lg">
            Unlock Gallery
          </Button>
        </form>
      </Card>
    </main>
  );
};
