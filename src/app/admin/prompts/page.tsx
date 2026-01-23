"use client";

import { useEffect, useState, useCallback } from "react";

interface ServicePrompt {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  promptType: "INTENT" | "BLUEPRINT" | "CUSTOM";
  template: string;
  isActive: boolean;
  version: number;
  sortOrder: number;
  placeholders: string[];
  createdAt: string;
  updatedAt: string;
}

interface GenieService {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  isActive: boolean;
  sortOrder: number;
  prompts: ServicePrompt[];
}

export default function PromptsPage() {
  const [services, setServices] = useState<GenieService[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedService, setExpandedService] = useState<string | null>(null);
  const [editingPrompt, setEditingPrompt] = useState<{
    serviceId: string;
    prompt: ServicePrompt;
  } | null>(null);
  const [isCreatingPrompt, setIsCreatingPrompt] = useState<string | null>(null);
  const [newPrompt, setNewPrompt] = useState({
    slug: "",
    name: "",
    description: "",
    promptType: "CUSTOM" as "INTENT" | "BLUEPRINT" | "CUSTOM",
    template: "",
    placeholders: [] as string[],
    isActive: true,
  });
  const [placeholderInput, setPlaceholderInput] = useState("");

  const fetchServices = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/services");
      if (response.ok) {
        const data = await response.json();
        setServices(data.services);
        // Auto-expand first service if none expanded
        if (data.services.length > 0 && !expandedService) {
          setExpandedService(data.services[0].id);
        }
      }
    } catch (error) {
      console.error("Error fetching services:", error);
    } finally {
      setIsLoading(false);
    }
  }, [expandedService]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const handleCreatePrompt = async (serviceId: string) => {
    if (!newPrompt.slug || !newPrompt.name || !newPrompt.template) {
      alert("Slug, name, and template are required");
      return;
    }

    try {
      const response = await fetch(`/api/admin/services/${serviceId}/prompts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPrompt),
      });

      if (response.ok) {
        await fetchServices();
        setIsCreatingPrompt(null);
        setNewPrompt({
          slug: "",
          name: "",
          description: "",
          promptType: "CUSTOM",
          template: "",
          placeholders: [],
          isActive: true,
        });
      } else {
        const data = await response.json();
        alert(data.error || "Error creating prompt");
      }
    } catch (error) {
      console.error("Error creating prompt:", error);
      alert("Error creating prompt");
    }
  };

  const handleUpdatePrompt = async () => {
    if (!editingPrompt) return;

    try {
      const response = await fetch(
        `/api/admin/services/${editingPrompt.serviceId}/prompts/${editingPrompt.prompt.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: editingPrompt.prompt.name,
            description: editingPrompt.prompt.description,
            promptType: editingPrompt.prompt.promptType,
            template: editingPrompt.prompt.template,
            placeholders: editingPrompt.prompt.placeholders,
            isActive: editingPrompt.prompt.isActive,
          }),
        }
      );

      if (response.ok) {
        await fetchServices();
        setEditingPrompt(null);
      } else {
        const data = await response.json();
        alert(data.error || "Error updating prompt");
      }
    } catch (error) {
      console.error("Error updating prompt:", error);
      alert("Error updating prompt");
    }
  };

  const handleDeletePrompt = async (serviceId: string, promptId: string) => {
    if (!confirm("Are you sure you want to delete this prompt?")) return;

    try {
      const response = await fetch(
        `/api/admin/services/${serviceId}/prompts/${promptId}`,
        { method: "DELETE" }
      );

      if (response.ok) {
        await fetchServices();
      } else {
        const data = await response.json();
        alert(data.error || "Error deleting prompt");
      }
    } catch (error) {
      console.error("Error deleting prompt:", error);
      alert("Error deleting prompt");
    }
  };

  const handleToggleServiceActive = async (service: GenieService) => {
    try {
      const response = await fetch(`/api/admin/services/${service.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !service.isActive }),
      });

      if (response.ok) {
        await fetchServices();
      }
    } catch (error) {
      console.error("Error toggling service:", error);
    }
  };

  const addPlaceholder = (isEditing: boolean) => {
    if (!placeholderInput.trim()) return;
    const placeholder = placeholderInput.trim().toLowerCase().replace(/\s+/g, "_");
    
    if (isEditing && editingPrompt) {
      if (!editingPrompt.prompt.placeholders.includes(placeholder)) {
        setEditingPrompt({
          ...editingPrompt,
          prompt: {
            ...editingPrompt.prompt,
            placeholders: [...editingPrompt.prompt.placeholders, placeholder],
          },
        });
      }
    } else {
      if (!newPrompt.placeholders.includes(placeholder)) {
        setNewPrompt({
          ...newPrompt,
          placeholders: [...newPrompt.placeholders, placeholder],
        });
      }
    }
    setPlaceholderInput("");
  };

  const removePlaceholder = (placeholder: string, isEditing: boolean) => {
    if (isEditing && editingPrompt) {
      setEditingPrompt({
        ...editingPrompt,
        prompt: {
          ...editingPrompt.prompt,
          placeholders: editingPrompt.prompt.placeholders.filter((p) => p !== placeholder),
        },
      });
    } else {
      setNewPrompt({
        ...newPrompt,
        placeholders: newPrompt.placeholders.filter((p) => p !== placeholder),
      });
    }
  };

  const getPromptTypeColor = (type: string) => {
    switch (type) {
      case "INTENT":
        return "bg-blue-500";
      case "BLUEPRINT":
        return "bg-purple-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white mb-2">
          Services & Prompts
        </h1>
        <p className="text-white/70">
          Manage Genie services and their associated prompts. Each service can have multiple prompts (Intent, Blueprint, Custom).
        </p>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <span className="star-spinner text-white">★</span>
          <p className="text-white/70 mt-4">Loading services...</p>
        </div>
      ) : services.length === 0 ? (
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-12 text-center border border-white/10">
          <div className="text-6xl mb-4">🧞</div>
          <h3 className="text-xl font-bold text-white mb-2">
            No services configured
          </h3>
          <p className="text-white/70 mb-4">
            Run the database seed to create default services and prompts.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {services.map((service) => (
            <div
              key={service.id}
              className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden"
            >
              {/* Service Header */}
              <div
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
                onClick={() =>
                  setExpandedService(
                    expandedService === service.id ? null : service.id
                  )
                }
              >
                <div className="flex items-center gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-bold text-white">
                        {service.name}
                      </h3>
                      <span
                        className={`px-2 py-0.5 text-xs font-bold rounded ${
                          service.isActive
                            ? "bg-green-500 text-white"
                            : "bg-gray-500 text-white"
                        }`}
                      >
                        {service.isActive ? "Active" : "Inactive"}
                      </span>
                      <span className="px-2 py-0.5 text-xs bg-white/20 text-white rounded">
                        {service.prompts.length} prompts
                      </span>
                    </div>
                    <p className="text-white/60 text-sm">{service.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleServiceActive(service);
                    }}
                    className={`px-3 py-1 text-sm rounded transition-colors ${
                      service.isActive
                        ? "text-yellow-400 hover:bg-yellow-500/20"
                        : "text-green-400 hover:bg-green-500/20"
                    }`}
                  >
                    {service.isActive ? "Disable" : "Enable"}
                  </button>
                  <span className="text-white/40 text-xl">
                    {expandedService === service.id ? "▼" : "▶"}
                  </span>
                </div>
              </div>

              {/* Service Prompts (Expanded) */}
              {expandedService === service.id && (
                <div className="border-t border-white/10 p-4 space-y-4">
                  {service.prompts.length === 0 ? (
                    <p className="text-white/50 text-center py-4">
                      No prompts configured for this service.
                    </p>
                  ) : (
                    service.prompts.map((prompt) => (
                      <div
                        key={prompt.id}
                        className="bg-black/20 rounded-lg p-4 border border-white/5"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-bold text-white">{prompt.name}</h4>
                              <span
                                className={`px-2 py-0.5 text-xs font-bold rounded text-white ${getPromptTypeColor(
                                  prompt.promptType
                                )}`}
                              >
                                {prompt.promptType}
                              </span>
                              <span className="px-2 py-0.5 text-xs bg-white/10 text-white/70 rounded">
                                v{prompt.version}
                              </span>
                              {!prompt.isActive && (
                                <span className="px-2 py-0.5 text-xs bg-red-500/20 text-red-400 rounded">
                                  Inactive
                                </span>
                              )}
                            </div>
                            <p className="text-white/50 text-sm">
                              Slug: <code className="bg-white/10 px-1 rounded">{prompt.slug}</code>
                            </p>
                            {prompt.description && (
                              <p className="text-white/60 text-sm mt-1">{prompt.description}</p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() =>
                                setEditingPrompt({ serviceId: service.id, prompt })
                              }
                              className="px-3 py-1 text-sm text-accent-teal hover:bg-accent-teal/20 rounded transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeletePrompt(service.id, prompt.id)}
                              className="px-3 py-1 text-sm text-red-400 hover:bg-red-500/20 rounded transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        </div>

                        {/* Placeholders */}
                        {prompt.placeholders.length > 0 && (
                          <div className="mb-3">
                            <span className="text-white/50 text-xs">Placeholders: </span>
                            {prompt.placeholders.map((p) => (
                              <code
                                key={p}
                                className="text-xs bg-accent-purple/30 text-accent-purple px-1.5 py-0.5 rounded mr-1"
                              >
                                {`{${p}}`}
                              </code>
                            ))}
                          </div>
                        )}

                        {/* Template Preview */}
                        <pre className="bg-black/30 rounded p-3 text-white/70 text-xs overflow-x-auto max-h-24 overflow-y-auto font-mono">
                          {prompt.template}
                        </pre>
                      </div>
                    ))
                  )}

                  {/* Add Prompt Button */}
                  <button
                    onClick={() => setIsCreatingPrompt(service.id)}
                    className="w-full py-3 border border-dashed border-white/20 rounded-lg text-white/60 hover:text-white hover:border-white/40 transition-colors"
                  >
                    + Add New Prompt
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Prompt Modal */}
      {(isCreatingPrompt || editingPrompt) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-primary-dark rounded-xl p-6 w-full max-w-3xl border border-white/10 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-white mb-4">
              {isCreatingPrompt ? "Create New Prompt" : "Edit Prompt"}
            </h3>

            <div className="space-y-4">
              {/* Slug (only for creation) */}
              {isCreatingPrompt && (
                <div>
                  <label className="block text-white/70 text-sm mb-2">
                    Slug * <span className="text-white/40">(unique identifier)</span>
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50"
                    placeholder="e.g.: intent, blueprint, custom_step"
                    value={newPrompt.slug}
                    onChange={(e) =>
                      setNewPrompt({
                        ...newPrompt,
                        slug: e.target.value.toLowerCase().replace(/\s+/g, "_"),
                      })
                    }
                  />
                </div>
              )}

              {/* Name */}
              <div>
                <label className="block text-white/70 text-sm mb-2">Name *</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50"
                  placeholder="e.g.: Intent Classification"
                  value={
                    isCreatingPrompt ? newPrompt.name : editingPrompt?.prompt.name || ""
                  }
                  onChange={(e) =>
                    isCreatingPrompt
                      ? setNewPrompt({ ...newPrompt, name: e.target.value })
                      : setEditingPrompt({
                          ...editingPrompt!,
                          prompt: { ...editingPrompt!.prompt, name: e.target.value },
                        })
                  }
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-white/70 text-sm mb-2">Description</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50"
                  placeholder="Brief description of what this prompt does"
                  value={
                    isCreatingPrompt
                      ? newPrompt.description
                      : editingPrompt?.prompt.description || ""
                  }
                  onChange={(e) =>
                    isCreatingPrompt
                      ? setNewPrompt({ ...newPrompt, description: e.target.value })
                      : setEditingPrompt({
                          ...editingPrompt!,
                          prompt: { ...editingPrompt!.prompt, description: e.target.value },
                        })
                  }
                />
              </div>

              {/* Prompt Type */}
              <div>
                <label className="block text-white/70 text-sm mb-2">Prompt Type</label>
                <select
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                  value={
                    isCreatingPrompt
                      ? newPrompt.promptType
                      : editingPrompt?.prompt.promptType || "CUSTOM"
                  }
                  onChange={(e) => {
                    const value = e.target.value as "INTENT" | "BLUEPRINT" | "CUSTOM";
                    if (isCreatingPrompt) {
                      setNewPrompt({ ...newPrompt, promptType: value });
                    } else {
                      setEditingPrompt({
                        ...editingPrompt!,
                        prompt: { ...editingPrompt!.prompt, promptType: value },
                      });
                    }
                  }}
                >
                  <option value="INTENT">INTENT - Classifies user intent</option>
                  <option value="BLUEPRINT">BLUEPRINT - Generates main output</option>
                  <option value="CUSTOM">CUSTOM - Custom processing step</option>
                </select>
              </div>

              {/* Placeholders */}
              <div>
                <label className="block text-white/70 text-sm mb-2">
                  Placeholders{" "}
                  <span className="text-white/40">
                    (variables that will be replaced in the template)
                  </span>
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50"
                    placeholder="e.g.: keyword, location, store"
                    value={placeholderInput}
                    onChange={(e) => setPlaceholderInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addPlaceholder(!!editingPrompt);
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => addPlaceholder(!!editingPrompt)}
                    className="px-4 py-2 bg-accent-purple text-white rounded-lg hover:bg-accent-purple/80"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(isCreatingPrompt
                    ? newPrompt.placeholders
                    : editingPrompt?.prompt.placeholders || []
                  ).map((p) => (
                    <span
                      key={p}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-accent-purple/30 text-accent-purple rounded text-sm"
                    >
                      {`{${p}}`}
                      <button
                        type="button"
                        onClick={() => removePlaceholder(p, !!editingPrompt)}
                        className="hover:text-red-400"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Template */}
              <div>
                <label className="block text-white/70 text-sm mb-2">
                  Prompt Template *{" "}
                  <span className="text-white/40">
                    (use {"{placeholder}"} for dynamic values)
                  </span>
                </label>
                <textarea
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 min-h-[250px] font-mono text-sm"
                  placeholder="Enter the prompt template here..."
                  value={
                    isCreatingPrompt
                      ? newPrompt.template
                      : editingPrompt?.prompt.template || ""
                  }
                  onChange={(e) =>
                    isCreatingPrompt
                      ? setNewPrompt({ ...newPrompt, template: e.target.value })
                      : setEditingPrompt({
                          ...editingPrompt!,
                          prompt: { ...editingPrompt!.prompt, template: e.target.value },
                        })
                  }
                />
              </div>

              {/* Active Toggle */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="promptIsActive"
                  checked={
                    isCreatingPrompt
                      ? newPrompt.isActive
                      : editingPrompt?.prompt.isActive || false
                  }
                  onChange={(e) =>
                    isCreatingPrompt
                      ? setNewPrompt({ ...newPrompt, isActive: e.target.checked })
                      : setEditingPrompt({
                          ...editingPrompt!,
                          prompt: { ...editingPrompt!.prompt, isActive: e.target.checked },
                        })
                  }
                  className="w-4 h-4"
                />
                <label htmlFor="promptIsActive" className="text-white/70 text-sm">
                  Active prompt
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setIsCreatingPrompt(null);
                  setEditingPrompt(null);
                  setNewPrompt({
                    slug: "",
                    name: "",
                    description: "",
                    promptType: "CUSTOM",
                    template: "",
                    placeholders: [],
                    isActive: true,
                  });
                  setPlaceholderInput("");
                }}
                className="flex-1 px-4 py-2 border border-white/20 text-white rounded-lg hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={
                  isCreatingPrompt
                    ? () => handleCreatePrompt(isCreatingPrompt)
                    : handleUpdatePrompt
                }
                className="flex-1 px-4 py-2 bg-accent-purple text-white rounded-lg hover:bg-accent-purple/80 transition-colors"
              >
                {isCreatingPrompt ? "Create" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
