import { useState, useEffect } from "react";
import { getApiUrl } from "@/lib/api";
import { AppHeader } from "@/components/layout/AppHeader";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useUserEmail } from "@/hooks/use-galleries";
import { toast } from "sonner";
import { Save, ShieldAlert } from "lucide-react";

interface ServiceSetting {
  enabled: boolean;
  apiKey: string;
}

interface SettingsState {
  dropbox: ServiceSetting;
  gdrive: ServiceSetting;
  onedrive: ServiceSetting;
}

const Settings = () => {
  const { data: userEmail = "" } = useUserEmail();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<SettingsState>({
    dropbox: { enabled: false, apiKey: "" },
    gdrive: { enabled: false, apiKey: "" },
    onedrive: { enabled: false, apiKey: "" },
  });

  useEffect(() => {
    fetchSettings();

    // Check for Dropbox OAuth code redirect query parameters
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (code) {
      exchangeDropboxCode(code);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const exchangeDropboxCode = async (code: string) => {
    setLoading(true);
    try {
      const redirectUri = window.location.origin + "/settings";
      const response = await fetch(getApiUrl("/api/dropbox-auth"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code, redirectUri }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to link Dropbox");
      }

      toast.success("Successfully authorized and connected to Dropbox!");
      // Clean query parameters from URL without reloading the page
      window.history.replaceState({}, document.title, window.location.pathname);
      await fetchSettings();
    } catch (error: unknown) {
      console.error("Dropbox OAuth error:", error);
      const msg = error instanceof Error ? error.message : "Failed to link Dropbox";
      toast.error(msg);
      // Still clean URL params in case of failure to avoid loop attempts
      window.history.replaceState({}, document.title, window.location.pathname);
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch(getApiUrl("/api/settings"));
      if (!response.ok) throw new Error("Failed to load settings");
      const data = await response.json();
      setSettings({
        dropbox: data.dropbox || { enabled: false, apiKey: "" },
        gdrive: data.gdrive || { enabled: false, apiKey: "" },
        onedrive: data.onedrive || { enabled: false, apiKey: "" },
      });
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast.error("Failed to load account settings");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(getApiUrl("/api/settings"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settings),
      });

      if (!response.ok) throw new Error("Failed to save settings");
      toast.success("Settings saved successfully!");
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const updateService = (service: keyof SettingsState, field: keyof ServiceSetting, value: string | boolean) => {
    setSettings((prev) => ({
      ...prev,
      [service]: {
        ...prev[service],
        [field]: value,
      },
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader userEmail={userEmail} />
        <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading settings...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader userEmail={userEmail} />

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-serif mb-2 font-medium">Account Settings</h2>
            <p className="text-muted-foreground">
              Manage integrations, API keys, and external media settings
            </p>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </div>

        <div className="space-y-6">
          <Card className="p-6 bg-card/65 backdrop-blur-md border border-border">
            <h3 className="text-xl font-serif mb-6 flex items-center gap-2">
              Connect External Source
            </h3>

            <div className="space-y-6 divide-y divide-border/60">
              {/* Dropbox Toggle */}
              <div className="space-y-4 pt-1">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="dropbox-toggle" className="text-base font-semibold">
                      Dropbox Integration
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Import files and sync folders directly from your Dropbox account
                    </p>
                  </div>
                  <Switch
                    id="dropbox-toggle"
                    checked={settings.dropbox.enabled}
                    onCheckedChange={(checked) => updateService("dropbox", "enabled", checked)}
                  />
                </div>
                 {settings.dropbox.enabled && (
                  <div className="space-y-4 pl-2 border-l-2 border-primary/20">
                    <div className="flex items-center gap-3 pt-1">
                      {settings.dropbox.apiKey ? (
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm font-semibold">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                            Connected to Dropbox
                          </div>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => updateService("dropbox", "apiKey", "")}
                          >
                            Disconnect Dropbox
                          </Button>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          <Button
                            onClick={() => {
                              const redirectUri = window.location.origin + "/settings";
                              const appKey = "ad1o4zsc1obb539";
                              window.location.href = `https://www.dropbox.com/oauth2/authorize?client_id=${appKey}&response_type=code&token_access_type=offline&redirect_uri=${encodeURIComponent(redirectUri)}`;
                            }}
                          >
                            Connect Dropbox Account
                          </Button>
                          <p className="text-xs text-muted-foreground">
                            Please make sure to add <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-[11px]">{window.location.origin}/settings</code> as a Redirect URI in your Dropbox Developer Console app settings.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Google Drive Toggle */}
              <div className="space-y-4 pt-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="gdrive-toggle" className="text-base font-semibold">
                      Google Drive Integration
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Link shared Google Drive folders directly to your galleries
                    </p>
                  </div>
                  <Switch
                    id="gdrive-toggle"
                    checked={settings.gdrive.enabled}
                    onCheckedChange={(checked) => updateService("gdrive", "enabled", checked)}
                  />
                </div>
                {settings.gdrive.enabled && (
                  <div className="space-y-2 pl-2 border-l-2 border-primary/20">
                    <Label htmlFor="gdrive-key">Google API Key</Label>
                    <Input
                      id="gdrive-key"
                      type="password"
                      placeholder="AIzaSy..."
                      value={settings.gdrive.apiKey}
                      onChange={(e) => updateService("gdrive", "apiKey", e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Create an API key with Google Drive API access in Google Cloud Console.
                    </p>
                  </div>
                )}
              </div>

              {/* OneDrive Toggle */}
              <div className="space-y-4 pt-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="onedrive-toggle" className="text-base font-semibold">
                      OneDrive Integration
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Sync photos from Microsoft OneDrive shared folders
                    </p>
                  </div>
                  <Switch
                    id="onedrive-toggle"
                    checked={settings.onedrive.enabled}
                    onCheckedChange={(checked) => updateService("onedrive", "enabled", checked)}
                  />
                </div>
                {settings.onedrive.enabled && (
                  <div className="space-y-2 pl-2 border-l-2 border-primary/20">
                    <Label htmlFor="onedrive-key">OneDrive API Key / Client ID</Label>
                    <Input
                      id="onedrive-key"
                      type="password"
                      placeholder="Client ID or secret token"
                      value={settings.onedrive.apiKey}
                      onChange={(e) => updateService("onedrive", "apiKey", e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Provide Microsoft Graph API access credentials.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-yellow-500/10 border border-yellow-500/30 flex gap-3 text-sm text-yellow-700 dark:text-yellow-400">
            <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Security Note:</span> API keys are stored locally on
              your workspace server and used solely for secure sync processing. Never share your tokens publicly.
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Settings;
