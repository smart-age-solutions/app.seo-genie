"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { UserRole } from "@/types/database";
import { backendApi } from "@/lib/backend-api";

interface AISettings {
  aiProvider: string;
  aiModel: string;
  temperature: number;
  maxTokens: number;
  apiKey: string | null;
  hasApiKey?: boolean;
}

interface GoogleSettings {
  oauthClientId: string | null;
  hasOauthClientId: boolean;
  oauthClientSecret: string | null;
  hasOauthClientSecret: boolean;
  searchApiKey: string | null;
  hasSearchApiKey: boolean;
  searchEngineId: string | null;
  hasSearchEngineId: boolean;
}

const AI_PROVIDERS = [
  { value: "openai", label: "OpenAI" },
  // { value: "anthropic", label: "Anthropic" },
  // { value: "google", label: "Google AI" },
];

const AI_MODELS = {
  openai: [
    { value: "gpt-5.2", label: "GPT-5.2" },
    { value: "gpt-5.1", label: "GPT-5.1" },
    { value: "gpt-5", label: "GPT-5" },
    { value: "gpt-5-mini", label: "GPT-5 Mini" },
    { value: "gpt-5-nano", label: "GPT-5 Nano" },
    // { value: "gpt-5-pro", label: "GPT-5 Pro" },
    { value: "gpt-4.1", label: "GPT-4.1" },
    { value: "gpt-4.1-mini", label: "GPT-4.1 Mini" },
    { value: "gpt-4.1-nano", label: "GPT-4.1 Nano" },
    { value: "gpt-4o", label: "GPT-4o" },
    { value: "gpt-4o-mini", label: "GPT-4o Mini" },
    { value: "gpt-4", label: "GPT-4" },
  ],
  // anthropic: [
  //   { value: "claude-3-opus", label: "Claude 3 Opus" },
  //   { value: "claude-3-sonnet", label: "Claude 3 Sonnet" },
  //   { value: "claude-3-haiku", label: "Claude 3 Haiku" },
  // ],
  // google: [
  //   { value: "gemini-pro", label: "Gemini Pro" },
  //   { value: "gemini-ultra", label: "Gemini Ultra" },
  // ],
};

export default function SettingsPage() {
  const { data: session } = useSession();
  const [aiSettings, setAISettings] = useState<AISettings | null>(null);
  const [googleSettings, setGoogleSettings] = useState<GoogleSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  
  // Google settings form state - use null to track if field was modified
  const [newGoogleOAuthClientId, setNewGoogleOAuthClientId] = useState<string | null>(null);
  const [newGoogleOAuthClientSecret, setNewGoogleOAuthClientSecret] = useState<string | null>(null);
  const [newGoogleSearchApiKey, setNewGoogleSearchApiKey] = useState<string | null>(null);
  const [newGoogleSearchEngineId, setNewGoogleSearchEngineId] = useState<string | null>(null);
  const [showGoogleSecrets, setShowGoogleSecrets] = useState(false);

  const isAdmin = session?.user.role === UserRole.ADMIN;

  // Auto-hide toast after 3 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const fetchSettings = useCallback(async () => {
    try {
      // Fetch AI settings from backend
      const aiSettingsData = await backendApi.settings.ai.get();
      
      // Fetch Google settings from backend (admin only)
      let googleSettingsData = null;
      if (isAdmin) {
        googleSettingsData = await backendApi.settings.google.get();
      }

      if (aiSettingsData) {
        // Map backend fields to frontend interface
        // Backend may return 'defaultModel' instead of 'aiModel'
        const mappedSettings = {
          aiProvider: aiSettingsData.aiProvider || "openai",
          aiModel: aiSettingsData.aiModel || (aiSettingsData as { defaultModel?: string }).defaultModel || AI_MODELS.openai[0]?.value || "",
          temperature: aiSettingsData.temperature ?? 0.7,
          maxTokens: aiSettingsData.maxTokens ?? 4000,
          apiKey: aiSettingsData.apiKey || null,
          hasApiKey: aiSettingsData.hasApiKey || false,
        };
        setAISettings(mappedSettings);
      }

      if (googleSettingsData) {
        setGoogleSettings(googleSettingsData);
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    } finally {
      setIsLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSaveAISettings = async () => {
    if (!aiSettings) return;
    setIsSaving(true);

    try {
      // Ensure all required fields have values
      const payload: Record<string, unknown> = {
        aiProvider: aiSettings.aiProvider || "openai",
        aiModel: aiSettings.aiModel || AI_MODELS.openai[0]?.value || "gpt-4",
        temperature: aiSettings.temperature ?? 0.7,
        maxTokens: aiSettings.maxTokens ?? 4000,
      };
      
      if (!payload.aiProvider || !payload.aiModel) {
        setToast({ 
          message: "AI Provider and Model are required", 
          type: "error" 
        });
        setIsSaving(false);
        return;
      }

      if (newApiKey !== null) {
        payload.apiKey = newApiKey;
      }

      await backendApi.settings.ai.update(payload);
      setNewApiKey(null);
      setToast({ message: "AI settings saved successfully!", type: "success" });
      fetchSettings();
    } catch (error) {
      console.error("Error saving AI settings:", error);
      setToast({ 
        message: error instanceof Error ? error.message : "Error saving settings", 
        type: "error" 
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveGoogleSettings = async () => {
    setIsSaving(true);

    try {
      const payload: Record<string, unknown> = {};

      // Only include fields that were modified (not null)
      // null means field wasn't touched, so we don't send it
      // Empty string means user wants to clear the value
      if (newGoogleOAuthClientId !== null) {
        payload.oauthClientId = newGoogleOAuthClientId;
      }
      
      if (newGoogleOAuthClientSecret !== null) {
        payload.oauthClientSecret = newGoogleOAuthClientSecret;
      }
      
      if (newGoogleSearchApiKey !== null) {
        payload.searchApiKey = newGoogleSearchApiKey;
      }
      
      if (newGoogleSearchEngineId !== null) {
        payload.searchEngineId = newGoogleSearchEngineId;
      }

      if (Object.keys(payload).length === 0) {
        setToast({ message: "No changes to save", type: "error" });
        setIsSaving(false);
        return;
      }

      await backendApi.settings.google.update(payload);
      setNewGoogleOAuthClientId(null);
      setNewGoogleOAuthClientSecret(null);
      setNewGoogleSearchApiKey(null);
      setNewGoogleSearchEngineId(null);
      setToast({ message: "Google settings saved successfully!", type: "success" });
      fetchSettings();
    } catch (error) {
      console.error("Error saving Google settings:", error);
      setToast({ 
        message: error instanceof Error ? error.message : "Error saving settings", 
        type: "error" 
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <span className="star-spinner text-white">★</span>
        <p className="text-white/70 mt-4">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white mb-2">
          Settings
        </h1>
        <p className="text-white/70">
          Configure system options.
        </p>
      </div>

      {/* AI Settings */}
      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/10">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <span>🤖</span> AI Settings
        </h2>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-white/70 text-sm mb-2">
                AI Provider
              </label>
              <select
                className="dark-select"
                value={aiSettings?.aiProvider || "openai"}
                onChange={(e) =>
                  setAISettings({
                    ...aiSettings!,
                    aiProvider: e.target.value,
                    aiModel: AI_MODELS[e.target.value as keyof typeof AI_MODELS]?.[0]?.value || "",
                  })
                }
              >
                {AI_PROVIDERS.map((provider) => (
                  <option key={provider.value} value={provider.value}>
                    {provider.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-white/70 text-sm mb-2">
                Model
              </label>
              <select
                className="dark-select"
                value={aiSettings?.aiModel || ""}
                onChange={(e) =>
                  setAISettings({ ...aiSettings!, aiModel: e.target.value })
                }
              >
                {(AI_MODELS[aiSettings?.aiProvider as keyof typeof AI_MODELS] || AI_MODELS.openai).map((model) => (
                  <option key={model.value} value={model.value}>
                    {model.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-white/70 text-sm mb-2">
                Temperature ({aiSettings?.temperature || 0.7})
              </label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                className="w-full"
                value={aiSettings?.temperature || 0.7}
                onChange={(e) =>
                  setAISettings({
                    ...aiSettings!,
                    temperature: parseFloat(e.target.value),
                  })
                }
              />
              <p className="text-white/50 text-xs mt-1">
                Higher values = more creative responses
              </p>
            </div>

            <div>
              <label className="block text-white/70 text-sm mb-2">
                Max Tokens
              </label>
              <input
                type="number"
                className="dark-input"
                value={aiSettings?.maxTokens || 4000}
                onChange={(e) =>
                  setAISettings({
                    ...aiSettings!,
                    maxTokens: parseInt(e.target.value) || 4000,
                  })
                }
              />
            </div>
          </div>

          {/* API Key (Admin only) */}
          {isAdmin && (
            <div>
              <label className="block text-white/70 text-sm mb-2">
                OpenAI API Key
              </label>
              <input
                type={showApiKey ? "text" : "password"}
                className="dark-input"
                placeholder={aiSettings?.hasApiKey ? "Enter new key to replace..." : "sk-..."}
                value={newApiKey !== null ? newApiKey : (aiSettings?.apiKey || "")}
                onChange={(e) => setNewApiKey(e.target.value)}
              />
              <div className="flex items-center gap-2 mt-1">
                {aiSettings?.hasApiKey ? (
                  <>
                    <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
                    <p className="text-green-400 text-xs">
                      API Key configured
                    </p>
                  </>
                ) : (
                  <>
                    <span className="inline-block w-2 h-2 bg-red-500 rounded-full"></span>
                    <p className="text-red-400 text-xs">
                      No API Key configured. Please configure it to use AI features.
                    </p>
                  </>
                )}
              </div>
              <p className="text-white/50 text-xs mt-1">
                This key will be used by the backend to make OpenAI API calls.
              </p>
            </div>
          )}

          <div className="flex items-center gap-4">
            {isAdmin && (
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="dark-btn text-sm"
              >
                {showApiKey ? "🙈 Hide Secret" : "👁️ Show Secret"}
              </button>
            )}

            <button
              onClick={handleSaveAISettings}
              disabled={isSaving}
              className="genie-btn disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save AI Settings"}
            </button>
          </div>
        </div>
      </div>

      {/* Google Settings (Admin only) */}
      {isAdmin && (
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/10 mt-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <span>🔍</span> Google Settings
          </h2>
          <p className="text-white/50 text-sm mb-4">
            Configure Google OAuth (for login) and Google Custom Search API (for SEO search).
          </p>

          <div className="space-y-6">
            {/* OAuth Settings Section */}
            <div className="border-b border-white/10 pb-4">
              <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                <span>🔐</span> OAuth Settings (Google Sign-In)
              </h3>
              <p className="text-white/50 text-xs mb-3">
                These credentials are used for Google Sign-In authentication. Get them from{" "}
                <a 
                  href="https://console.cloud.google.com/apis/credentials" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline"
                >
                  Google Cloud Console
                </a>.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-white/70 text-sm mb-2">
                    OAuth Client ID
                  </label>
                  <input
                    type={showGoogleSecrets ? "text" : "password"}
                    className="dark-input"
                    placeholder={googleSettings?.hasOauthClientId ? "Enter new to replace..." : "xxxx.apps.googleusercontent.com"}
                    value={newGoogleOAuthClientId !== null ? newGoogleOAuthClientId : (googleSettings?.oauthClientId || "")}
                    onChange={(e) => setNewGoogleOAuthClientId(e.target.value)}
                  />
                  <div className="flex items-center gap-2 mt-1">
                    {googleSettings?.hasOauthClientId ? (
                      <>
                        <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
                        <p className="text-green-400 text-xs">
                          Configured
                        </p>
                      </>
                    ) : (
                      <>
                        <span className="inline-block w-2 h-2 bg-red-500 rounded-full"></span>
                        <p className="text-red-400 text-xs">
                          Not configured. Google Sign-In will be disabled.
                        </p>
                      </>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-white/70 text-sm mb-2">
                    OAuth Client Secret
                  </label>
                  <input
                    type={showGoogleSecrets ? "text" : "password"}
                    className="dark-input"
                    placeholder={googleSettings?.hasOauthClientSecret ? "Enter new to replace..." : "GOCSPX-xxxxx"}
                    value={newGoogleOAuthClientSecret !== null ? newGoogleOAuthClientSecret : (googleSettings?.oauthClientSecret || "")}
                    onChange={(e) => setNewGoogleOAuthClientSecret(e.target.value)}
                  />
                  <div className="flex items-center gap-2 mt-1">
                    {googleSettings?.hasOauthClientSecret ? (
                      <>
                        <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
                        <p className="text-green-400 text-xs">
                          Configured
                        </p>
                      </>
                    ) : (
                      <>
                        <span className="inline-block w-2 h-2 bg-red-500 rounded-full"></span>
                        <p className="text-red-400 text-xs">
                          Not configured. Google Sign-In will be disabled.
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Search API Settings Section */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                <span>🔎</span> Search API Settings (Google Custom Search)
              </h3>
              <p className="text-white/50 text-xs mb-3">
                These credentials are used for Google Custom Search to find top-ranking pages. Get them from{" "}
                <a 
                  href="https://console.cloud.google.com/apis/credentials" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline"
                >
                  Google Cloud Console
                </a>{" "}
                and{" "}
                <a 
                  href="https://programmablesearchengine.google.com/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline"
                >
                  Programmable Search Engine
                </a>.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-white/70 text-sm mb-2">
                    Google API Key
                  </label>
                  <input
                    type={showGoogleSecrets ? "text" : "password"}
                    className="dark-input"
                    placeholder={googleSettings?.hasSearchApiKey ? "Enter new to replace..." : "AIzaSy..."}
                    value={newGoogleSearchApiKey !== null ? newGoogleSearchApiKey : (googleSettings?.searchApiKey || "")}
                    onChange={(e) => setNewGoogleSearchApiKey(e.target.value)}
                  />
                  <div className="flex items-center gap-2 mt-1">
                    {googleSettings?.hasSearchApiKey ? (
                      <>
                        <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
                        <p className="text-green-400 text-xs">
                          Configured
                        </p>
                      </>
                    ) : (
                      <>
                        <span className="inline-block w-2 h-2 bg-red-500 rounded-full"></span>
                        <p className="text-red-400 text-xs">
                          Not configured. Google Search features will not work.
                        </p>
                      </>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-white/70 text-sm mb-2">
                    Search Engine ID (CX)
                  </label>
                  <input
                    type={showGoogleSecrets ? "text" : "password"}
                    className="dark-input"
                    placeholder={googleSettings?.hasSearchEngineId ? "Enter new to replace..." : "xxxxx:xxxxx"}
                    value={newGoogleSearchEngineId !== null ? newGoogleSearchEngineId : (googleSettings?.searchEngineId || "")}
                    onChange={(e) => setNewGoogleSearchEngineId(e.target.value)}
                  />
                  <div className="flex items-center gap-2 mt-1">
                    {googleSettings?.hasSearchEngineId ? (
                      <>
                        <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
                        <p className="text-green-400 text-xs">
                          Configured
                        </p>
                      </>
                    ) : (
                      <>
                        <span className="inline-block w-2 h-2 bg-red-500 rounded-full"></span>
                        <p className="text-red-400 text-xs">
                          Not configured. Google Search features will not work.
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setShowGoogleSecrets(!showGoogleSecrets)}
                className="dark-btn text-sm"
              >
                {showGoogleSecrets ? "🙈 Hide Secret" : "👁️ Show Secret"}
              </button>

              <button
                onClick={handleSaveGoogleSettings}
                disabled={isSaving}
                className="genie-btn disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Save Google Settings"}
              </button>
            </div>

            <p className="text-white/40 text-xs mt-2">
              ⚠️ Note: OAuth settings changes require restarting the application to take effect.
              Search API settings are applied immediately.
            </p>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50 animate-fade-in">
          <div
            className={`px-6 py-3 rounded-lg shadow-lg ${
              toast.type === "success"
                ? "bg-green-500/90 text-white"
                : "bg-red-500/90 text-white"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">
                {toast.type === "success" ? "✓" : "✕"}
              </span>
              <span>{toast.message}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
