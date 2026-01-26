"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { UserRole } from "@/types/database";
import { Toast, MultiImageUpload, ImageUpload } from "@/components";
import { backendApi } from "@/lib/backend-api";

interface Service {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  image: string | null;
  images: string[];
  isActive: boolean;
  sortOrder: number;
  subServices: SubService[];
}

interface SubService {
  id: string;
  serviceId?: string; // Added for edit operations
  slug: string;
  name: string;
  subtitle: string | null;
  description: string | null;
  icon: string | null;
  image: string | null;
  isActive: boolean;
  sortOrder: number;
  prompts: ServicePrompt[];
}

interface ServicePrompt {
  id: string;
  subServiceId?: string;
  slug: string;
  name: string;
  description: string | null;
  promptType: string;
  dataSource: string | null;
  template: string;
  isActive: boolean;
  version: number;
  sortOrder: number;
  placeholders: string[];
}

export default function ServicesAdminPage() {
  const { data: session, status: sessionStatus } = useSession();
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [expandedService, setExpandedService] = useState<string | null>(null);
  const [expandedSubService, setExpandedSubService] = useState<string | null>(null);
  const [editingPrompt, setEditingPrompt] = useState<ServicePrompt | null>(null);
  const [showNewServiceModal, setShowNewServiceModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [showNewSubServiceModal, setShowNewSubServiceModal] = useState(false);
  const [editingSubService, setEditingSubService] = useState<SubService | null>(null);
  const [selectedServiceForSub, setSelectedServiceForSub] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: "service" | "subservice"; id: string; name: string } | null>(null);
  const [showNewPromptModal, setShowNewPromptModal] = useState(false);
  const [selectedSubServiceForPrompt, setSelectedSubServiceForPrompt] = useState<string | null>(null);

  const isAdmin = session?.user.role === UserRole.ADMIN;

  useEffect(() => {
    // Only fetch services when session is loaded and user is authenticated
    if (sessionStatus === "authenticated" && session?.user) {
      fetchServices();
    } else if (sessionStatus === "unauthenticated") {
      setIsLoading(false);
    }
  }, [sessionStatus, session]);

  const fetchServices = async () => {
    try {
      setIsLoading(true);
      const servicesList = await backendApi.services.getAll();
      
      // Fetch sub-services and prompts for each service
      const servicesWithDetails = await Promise.all(
        servicesList.map(async (service: Service) => {
          const subServices = await backendApi.subServices.getAll(service.id);
          const subServicesWithPrompts = await Promise.all(
            subServices.map(async (subService: SubService) => {
              const prompts = await backendApi.prompts.getBySubService(subService.id);
              return { ...subService, prompts };
            })
          );
          return { ...service, subServices: subServicesWithPrompts };
        })
      );
      
      setServices(servicesWithDetails);
    } catch (error) {
      console.error("Error fetching services:", error);
      setToast({ 
        message: error instanceof Error ? error.message : "Error loading services", 
        type: "error" 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleServiceActive = async (serviceId: string, isActive: boolean) => {
    try {
      await backendApi.services.update(serviceId, { isActive: !isActive });
      setToast({ message: `Service ${!isActive ? "enabled" : "disabled"} successfully`, type: "success" });
      fetchServices();
    } catch (error) {
      console.error("Error updating service:", error);
      setToast({ 
        message: error instanceof Error ? error.message : "Error updating service", 
        type: "error" 
      });
    }
  };

  const toggleSubServiceActive = async (subServiceId: string, isActive: boolean) => {
    try {
      await backendApi.subServices.update(subServiceId, { isActive: !isActive });
      setToast({ message: `Sub-service ${!isActive ? "enabled" : "disabled"} successfully`, type: "success" });
      fetchServices();
    } catch (error) {
      console.error("Error updating sub-service:", error);
      setToast({ 
        message: error instanceof Error ? error.message : "Error updating sub-service", 
        type: "error" 
      });
    }
  };

  const savePrompt = async () => {
    if (!editingPrompt || !editingPrompt.subServiceId) return;

    try {
      await backendApi.prompts.update(editingPrompt.id, {
        template: editingPrompt.template,
        isActive: editingPrompt.isActive,
        dataSource: editingPrompt.dataSource,
      });
      setToast({ message: "Prompt updated successfully", type: "success" });
      setEditingPrompt(null);
      fetchServices();
    } catch (error) {
      console.error("Error updating prompt:", error);
      setToast({ 
        message: error instanceof Error ? error.message : "Error updating prompt", 
        type: "error" 
      });
    }
  };

  const createService = async (data: { slug: string; name: string; description?: string; icon?: string; image?: string; images?: string[] }) => {
    try {
      await backendApi.services.create(data);
      setToast({ message: "Service created successfully", type: "success" });
      setShowNewServiceModal(false);
      fetchServices();
    } catch (error) {
      console.error("Error creating service:", error);
      setToast({ 
        message: error instanceof Error ? error.message : "Error creating service", 
        type: "error" 
      });
    }
  };

  const updateService = async (data: { id?: string; slug: string; name: string; description?: string; icon?: string; image?: string; images?: string[] }) => {
    if (!data.id) return;
    try {
      const { id, ...updateData } = data;
      await backendApi.services.update(id, updateData);
      setToast({ message: "Service updated successfully", type: "success" });
      setEditingService(null);
      fetchServices();
    } catch (error) {
      console.error("Error updating service:", error);
      setToast({ 
        message: error instanceof Error ? error.message : "Error updating service", 
        type: "error" 
      });
    }
  };

  const createSubService = async (data: { 
    serviceId: string; 
    slug: string; 
    name: string; 
    subtitle?: string;
    description?: string; 
    icon?: string;
    image?: string;
  }) => {
    try {
      await backendApi.subServices.create(data);
      setToast({ message: "Sub-service created successfully", type: "success" });
      setShowNewSubServiceModal(false);
      setSelectedServiceForSub(null);
      fetchServices();
    } catch (error) {
      console.error("Error creating sub-service:", error);
      setToast({ 
        message: error instanceof Error ? error.message : "Error creating sub-service", 
        type: "error" 
      });
    }
  };

  const updateSubService = async (data: { id?: string; serviceId: string; slug: string; name: string; subtitle?: string; description?: string; image?: string }) => {
    if (!data.id) return;
    try {
      const { id, ...updateData } = data;
      await backendApi.subServices.update(id, updateData);
      setToast({ message: "Sub-service updated successfully", type: "success" });
      setEditingSubService(null);
      fetchServices();
    } catch (error) {
      console.error("Error updating sub-service:", error);
      setToast({ 
        message: error instanceof Error ? error.message : "Error updating sub-service", 
        type: "error" 
      });
    }
  };

  const deleteService = async (serviceId: string) => {
    try {
      await backendApi.services.delete(serviceId);
      setToast({ message: "Service deleted successfully", type: "success" });
      setDeleteConfirm(null);
      fetchServices();
    } catch (error) {
      console.error("Error deleting service:", error);
      setToast({ 
        message: error instanceof Error ? error.message : "Error deleting service", 
        type: "error" 
      });
    }
  };

  const deleteSubService = async (subServiceId: string) => {
    try {
      await backendApi.subServices.delete(subServiceId);
      setToast({ message: "Sub-service deleted successfully", type: "success" });
      setDeleteConfirm(null);
      fetchServices();
    } catch (error) {
      console.error("Error deleting sub-service:", error);
      setToast({ 
        message: error instanceof Error ? error.message : "Error deleting sub-service", 
        type: "error" 
      });
    }
  };

  const createPrompt = async (data: {
    subServiceId: string;
    slug: string;
    name: string;
    description?: string;
    promptType: string;
    dataSource: string;
    template: string;
    placeholders?: string[];
  }) => {
    try {
      const { subServiceId, ...promptData } = data;
      await backendApi.prompts.create(subServiceId, promptData);
      setToast({ message: "Prompt created successfully", type: "success" });
      setShowNewPromptModal(false);
      setSelectedSubServiceForPrompt(null);
      fetchServices();
    } catch (error) {
      console.error("Error creating prompt:", error);
      setToast({ 
        message: error instanceof Error ? error.message : "Error creating prompt", 
        type: "error" 
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-white/70">Loading services...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Services Management</h1>
          <p className="text-white/70">
            Manage service categories, sub-services, and their prompts
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowNewServiceModal(true)}
            className="px-4 py-2 bg-accent-purple hover:bg-accent-purple/80 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Service
          </button>
        )}
      </div>

      {/* Service Categories */}
      <div className="space-y-4">
        {services.map((service) => (
          <div key={service.id} className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
            {/* Service Header */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-4 flex-1">
                <button
                  onClick={() => setExpandedService(expandedService === service.id ? null : service.id)}
                  className="text-white/70 hover:text-white transition-colors"
                >
                  <svg
                    className={`w-5 h-5 transition-transform ${expandedService === service.id ? "rotate-90" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-white">{service.name}</h3>
                  <p className="text-sm text-white/60">{service.description}</p>
                  <p className="text-xs text-white/40 mt-1">Slug: {service.slug}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-sm ${service.isActive ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                  {service.isActive ? "Active" : "Inactive"}
                </span>
                {isAdmin && (
                  <>
                    <button
                      onClick={() => toggleServiceActive(service.id, service.isActive)}
                      className={`px-4 py-2 rounded-lg transition-colors ${
                        service.isActive
                          ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                          : "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                      }`}
                    >
                      {service.isActive ? "Disable" : "Enable"}
                    </button>
                    <button
                      onClick={() => setEditingService(service)}
                      className="p-2 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-lg transition-colors"
                      title="Edit service"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setDeleteConfirm({ type: "service", id: service.id, name: service.name })}
                      className="p-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg transition-colors"
                      title="Delete service"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Sub-Services */}
            {expandedService === service.id && (
              <div className="border-t border-white/10 p-4 space-y-4">
                {isAdmin && (
                  <button
                    onClick={() => {
                      setSelectedServiceForSub(service.id);
                      setShowNewSubServiceModal(true);
                    }}
                    className="w-full px-4 py-2 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded-lg transition-colors flex items-center justify-center gap-2 border border-white/10 border-dashed"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Sub-Service
                  </button>
                )}
                {service.subServices.length === 0 ? (
                  <p className="text-white/50 text-center py-4">No sub-services yet</p>
                ) : (
                  service.subServices.map((subService) => (
                    <div key={subService.id} className="bg-white/5 rounded-lg border border-white/10">
                      {/* Sub-Service Header */}
                      <div className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1">
                          <button
                            onClick={() => setExpandedSubService(expandedSubService === subService.id ? null : subService.id)}
                            className="text-white/70 hover:text-white transition-colors"
                          >
                            <svg
                              className={`w-4 h-4 transition-transform ${expandedSubService === subService.id ? "rotate-90" : ""}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                          <div className="flex-1">
                            <h4 className="text-lg font-medium text-white">
                              {subService.name}
                              {subService.subtitle && <span className="text-white/60 ml-2">({subService.subtitle})</span>}
                            </h4>
                            <p className="text-sm text-white/50">{subService.description}</p>
                            <p className="text-xs text-white/30 mt-1">Slug: {subService.slug}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-1 rounded text-xs ${subService.isActive ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                            {subService.isActive ? "Active" : "Inactive"}
                          </span>
                          {isAdmin && (
                            <>
                              <button
                                onClick={() => toggleSubServiceActive(subService.id, subService.isActive)}
                                className={`px-3 py-1 rounded text-sm transition-colors ${
                                  subService.isActive
                                    ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                                    : "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                                }`}
                              >
                                {subService.isActive ? "Disable" : "Enable"}
                              </button>
                              <button
                                onClick={() => setEditingSubService({ ...subService, serviceId: service.id })}
                                className="p-2 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded transition-colors"
                                title="Edit sub-service"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => setDeleteConfirm({ type: "subservice", id: subService.id, name: subService.name })}
                                className="p-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded transition-colors"
                                title="Delete sub-service"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Prompts */}
                      {expandedSubService === subService.id && (
                        <div className="border-t border-white/5 p-4 space-y-3">
                          {isAdmin && (
                            <button
                              onClick={() => {
                                setSelectedSubServiceForPrompt(subService.id);
                                setShowNewPromptModal(true);
                              }}
                              className="w-full px-4 py-2 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded-lg transition-colors flex items-center justify-center gap-2 border border-white/10 border-dashed"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                              Add Prompt
                            </button>
                          )}
                          {subService.prompts.length === 0 ? (
                            <p className="text-white/40 text-center py-2">No prompts configured yet</p>
                          ) : (
                            subService.prompts.map((prompt) => (
                              <div key={prompt.id} className="bg-white/5 rounded p-3">
                                <div className="flex items-center justify-between mb-2">
                                  <div>
                                    <h5 className="text-white font-medium">{prompt.name}</h5>
                                    <p className="text-xs text-white/50">{prompt.description}</p>
                                    <div className="flex gap-2 mt-1">
                                      <span className="text-xs text-white/40">Type: {prompt.promptType}</span>
                                      {prompt.promptType === "TOP_RESULTS" && prompt.dataSource && (
                                        <span className="text-xs text-white/40">Source: {prompt.dataSource}</span>
                                      )}
                                      <span className="text-xs text-white/40">Version: {prompt.version}</span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className={`px-2 py-1 rounded text-xs ${prompt.isActive ? "bg-green-500/20 text-green-400" : "bg-gray-500/20 text-gray-400"}`}>
                                      {prompt.isActive ? "Active" : "Inactive"}
                                    </span>
                                    <button
                                      onClick={() => setEditingPrompt({ ...prompt, subServiceId: subService.id })}
                                      className="px-3 py-1 bg-accent-purple hover:bg-accent-purple/80 text-white rounded text-sm transition-colors"
                                    >
                                      Edit
                                    </button>
                                  </div>
                                </div>
                                {/* TO DO: Remove any placeholders from the template on frontend and backend */}
                                {/* {prompt.placeholders.length > 0 && (
                                  <div className="mt-2">
                                    <p className="text-xs text-white/40 mb-1">Available placeholders:</p>
                                    <div className="flex flex-wrap gap-1">
                                      {prompt.placeholders.map((placeholder) => (
                                        <code key={placeholder} className="text-xs bg-white/10 px-2 py-0.5 rounded text-white/70">
                                          {`{${placeholder}}`}
                                        </code>
                                      ))}
                                    </div>
                                  </div>
                                )} */}
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-primary-dark border border-white/20 rounded-lg max-w-md w-full">
            <div className="p-6 border-b border-white/10">
              <h2 className="text-2xl font-bold text-white">Confirm Delete</h2>
            </div>
            <div className="p-6">
              <p className="text-white mb-2">
                Are you sure you want to delete <strong>{deleteConfirm.name}</strong>?
              </p>
              <p className="text-white/60 text-sm">
                {deleteConfirm.type === "service" 
                  ? "This will also delete all sub-services and prompts associated with this service."
                  : "This will also delete all prompts associated with this sub-service."
                }
              </p>
              <p className="text-red-400 text-sm mt-2">This action cannot be undone.</p>
            </div>
            <div className="p-6 border-t border-white/10 flex justify-end gap-4">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (deleteConfirm.type === "service") {
                    deleteService(deleteConfirm.id);
                  } else {
                    deleteSubService(deleteConfirm.id);
                  }
                }}
                className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Service Modal */}
      {(showNewServiceModal || editingService) && (
        <NewServiceModal
          existingService={editingService}
          onClose={() => {
            setShowNewServiceModal(false);
            setEditingService(null);
          }}
          onSave={editingService ? updateService : createService}
        />
      )}

      {/* New Sub-Service Modal */}
      {(showNewSubServiceModal && selectedServiceForSub || editingSubService) && (
        <NewSubServiceModal
          serviceId={selectedServiceForSub || editingSubService?.serviceId || ""}
          existingSubService={editingSubService}
          onClose={() => {
            setShowNewSubServiceModal(false);
            setSelectedServiceForSub(null);
            setEditingSubService(null);
          }}
          onSave={editingSubService ? updateSubService : createSubService}
        />
      )}

      {/* New Prompt Modal */}
      {showNewPromptModal && selectedSubServiceForPrompt && (
        <NewPromptModal
          subServiceId={selectedSubServiceForPrompt}
          onClose={() => {
            setShowNewPromptModal(false);
            setSelectedSubServiceForPrompt(null);
          }}
          onSave={createPrompt}
        />
      )}

      {/* Edit Prompt Modal */}
      {editingPrompt && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-primary-dark border border-white/20 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-white/10">
              <h2 className="text-2xl font-bold text-white">Edit Prompt</h2>
              <p className="text-white/60 mt-1">{editingPrompt.name}</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-white mb-2">Prompt Type</label>
                  <input
                    type="text"
                    value={editingPrompt.promptType}
                    disabled
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white/50 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-white mb-2">
                    Data Source {editingPrompt.promptType === "TOP_RESULTS" && "*"}
                  </label>
                  <select
                    value={editingPrompt.dataSource ?? ""}
                    onChange={(e) => setEditingPrompt({ ...editingPrompt, dataSource: e.target.value })}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-accent-purple"
                    required={editingPrompt.promptType === "TOP_RESULTS"}
                  >
                    <option value="GOOGLE">Google (Search + Scraping)</option>
                    <option value="CHATGPT">ChatGPT (AI Generated)</option>
                    <option value="GEMINI">Gemini (AI Generated)</option>
                  </select>
                  <p className="text-xs text-white/40 mt-1">
                    {editingPrompt.promptType === "TOP_RESULTS" 
                      ? "Select the data source for top results (required for TOP_RESULTS)"
                      : "Select the primary data source for this prompt (optional for other types)"}
                  </p>
                </div>
              </div>
              <div>
                <label className="block text-white mb-2">Prompt Template</label>
                <textarea
                  value={editingPrompt.template}
                  onChange={(e) => setEditingPrompt({ ...editingPrompt, template: e.target.value })}
                  className="w-full h-64 px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-accent-purple font-mono text-sm"
                  placeholder="Enter prompt template..."
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="promptActive"
                  checked={editingPrompt.isActive}
                  onChange={(e) => setEditingPrompt({ ...editingPrompt, isActive: e.target.checked })}
                  className="rounded"
                />
                <label htmlFor="promptActive" className="text-white">Active</label>
              </div>
              {/* TO DO: Remove any placeholders from the template on frontend and backend */}
              {/* {editingPrompt.placeholders.length > 0 && (
                <div>
                  <p className="text-white mb-2">Available placeholders:</p>
                  <div className="flex flex-wrap gap-2">
                    {editingPrompt.placeholders.map((placeholder) => (
                      <code key={placeholder} className="bg-white/10 px-3 py-1 rounded text-white/70">
                        {`{${placeholder}}`}
                      </code>
                    ))}
                  </div>
                </div>
              )} */}
            </div>
            <div className="p-6 border-t border-white/10 flex justify-end gap-4">
              <button
                onClick={() => setEditingPrompt(null)}
                className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={savePrompt}
                className="px-6 py-2 bg-accent-purple hover:bg-accent-purple/80 text-white rounded-lg transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// New Service Modal Component
function NewServiceModal({ 
  existingService,
  onClose, 
  onSave 
}: { 
  existingService?: Service | null;
  onClose: () => void; 
  onSave: (data: { id?: string; slug: string; name: string; description?: string; icon?: string; images?: string[] }) => void;
}) {
  const [formData, setFormData] = useState({
    slug: existingService?.slug || "",
    name: existingService?.name || "",
    description: existingService?.description || "",
    images: existingService?.images || [],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.slug && formData.name) {
      onSave({
        id: existingService?.id,
        slug: formData.slug,
        name: formData.name,
        description: formData.description || undefined,
        images: formData.images.length > 0 ? formData.images : undefined,
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-primary-dark border border-white/20 rounded-lg max-w-2xl w-full">
        <div className="p-6 border-b border-white/10">
          <h2 className="text-2xl font-bold text-white">{existingService ? "Edit Service" : "Create New Service"}</h2>
          <p className="text-white/60 mt-1">{existingService ? "Update service information" : "Add a new service category (e.g., SEO, GEO)"}</p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-white mb-2">Slug *</label>
            <input
              type="text"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-accent-purple"
              placeholder="e.g., seo, geo, social_media"
              required
              disabled={!!existingService}
            />
            <p className="text-xs text-white/40 mt-1">{existingService ? "Slug cannot be changed after creation" : "Unique identifier (lowercase, use underscores for spaces)"}</p>
          </div>
          <div>
            <label className="block text-white mb-2">Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-accent-purple"
              placeholder="e.g., SEO Services"
              required
            />
          </div>
          <div>
            <label className="block text-white mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full h-24 px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-accent-purple"
              placeholder="Brief description of this service category..."
            />
          </div>
          <div className="w-1/2">
            <MultiImageUpload
              label="Service Images"
              images={formData.images}
              onChange={(images) => setFormData({ ...formData, images })}
              maxImages={3}
            />
          </div>
          <div className="flex justify-end gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-accent-purple hover:bg-accent-purple/80 text-white rounded-lg transition-colors"
            >
              {existingService ? "Update Service" : "Create Service"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// New Sub-Service Modal Component
function NewSubServiceModal({ 
  serviceId,
  existingSubService,
  onClose, 
  onSave 
}: { 
  serviceId: string;
  existingSubService?: SubService | null;
  onClose: () => void; 
  onSave: (data: { id?: string; serviceId: string; slug: string; name: string; subtitle?: string; description?: string; icon?: string; image?: string }) => void;
}) {
  const [formData, setFormData] = useState({
    slug: existingSubService?.slug || "",
    name: existingSubService?.name || "",
    subtitle: existingSubService?.subtitle || "",
    description: existingSubService?.description || "",
    image: existingSubService?.image || "",
  });

  console.log(formData);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.slug && formData.name) {
      onSave({
        id: existingSubService?.id,
        serviceId,
        slug: formData.slug,
        name: formData.name,
        subtitle: formData.subtitle || undefined,
        description: formData.description || undefined,
        image: formData.image || undefined,
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-primary-dark border border-white/20 rounded-lg max-w-2xl w-full">
        <div className="p-6 border-b border-white/10">
          <h2 className="text-2xl font-bold text-white">{existingSubService ? "Edit Sub-Service" : "Create New Sub-Service"}</h2>
          <p className="text-white/60 mt-1">{existingSubService ? "Update sub-service information" : "Add a new magic option under this service"}</p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-white mb-2">Slug *</label>
            <input
              type="text"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-accent-purple"
              placeholder="e.g., high_authority, collection, product"
              required
              disabled={!!existingSubService}
            />
            <p className="text-xs text-white/40 mt-1">{existingSubService ? "Slug cannot be changed after creation" : "Unique identifier (lowercase, use underscores for spaces)"}</p>
          </div>
          <div>
            <label className="block text-white mb-2">Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-accent-purple"
              placeholder="e.g., Genie High Authority"
              required
            />
          </div>
          <div>
            <label className="block text-white mb-2">Subtitle</label>
            <input
              type="text"
              value={formData.subtitle}
              onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-accent-purple"
              placeholder="e.g., PAGE, PAGE (Shopify)"
            />
          </div>
          <div>
            <label className="block text-white mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full h-24 px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-accent-purple"
              placeholder="Brief description of what this magic does..."
            />
          </div>
          <ImageUpload
            currentImage={formData.image}
            onImageChange={(imageUrl) => setFormData({ ...formData, image: imageUrl || "" })}
            label="Sub-Service Image"
            helpText="Upload a sub-service image (JPEG, PNG, WebP, SVG - max 5MB)"
          />
          <div className="flex justify-end gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-accent-purple hover:bg-accent-purple/80 text-white rounded-lg transition-colors"
            >
              {existingSubService ? "Update Sub-Service" : "Create Sub-Service"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function NewPromptModal({ 
  subServiceId, 
  onClose, 
  onSave 
}: { 
  subServiceId: string; 
  onClose: () => void; 
  onSave: (data: {
    subServiceId: string;
    slug: string;
    name: string;
    description?: string;
    promptType: string;
    dataSource?: string;
    template: string;
    placeholders?: string[];
  }) => void;
}) {
  const [formData, setFormData] = useState({
    slug: "",
    name: "",
    description: "",
    promptType: "INTENT",
    dataSource: "GOOGLE" as string | undefined,
    template: "",
    placeholders: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // TO DO: Remove any information about placeholders from the backend and frontend
    // Parse placeholders (comma-separated)
    // const placeholdersArray = formData.placeholders
    //   .split(",")
    //   .map(p => p.trim())
    //   .filter(p => p.length > 0);

    onSave({
      subServiceId,
      slug: formData.slug,
      name: formData.name,
      description: formData.description || undefined,
      promptType: formData.promptType,
      // Send dataSource for all types, backend will handle validation
      dataSource: formData.dataSource || (formData.promptType === "TOP_RESULTS" ? "GOOGLE" : undefined),
      template: formData.template,
      // placeholders: placeholdersArray.length > 0 ? placeholdersArray : undefined,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-primary-dark border border-white/20 rounded-lg max-w-3xl w-full my-8">
        <div className="p-6 border-b border-white/10">
          <h2 className="text-2xl font-bold text-white">Create New Prompt</h2>
          <p className="text-white/60 text-sm mt-1">
            Add a new prompt template for this sub-service
          </p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-white mb-2">Slug *</label>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-accent-purple"
                placeholder="e.g., intent, blueprint"
                required
              />
              <p className="text-xs text-white/40 mt-1">Lowercase, underscores only</p>
            </div>
            <div>
              <label className="block text-white mb-2">Prompt Type *</label>
              <select
                value={formData.promptType}
                onChange={(e) => {
                  const newType = e.target.value;
                  setFormData({ 
                    ...formData, 
                    promptType: newType,
                    // Keep dataSource if already set, or set default for TOP_RESULTS
                    dataSource: newType === "TOP_RESULTS" ? (formData.dataSource || "GOOGLE") : formData.dataSource
                  });
                }}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-accent-purple"
                required
              >
                <option value="TOP_RESULTS">TOP_RESULTS</option>
                <option value="INTENT">INTENT</option>
                <option value="BLUEPRINT">BLUEPRINT</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-white mb-2">
              Data Source {formData.promptType === "TOP_RESULTS" && "*"}
            </label>
            <select
              value={formData.dataSource || "GOOGLE"}
              onChange={(e) => setFormData({ ...formData, dataSource: e.target.value })}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-accent-purple"
              required={formData.promptType === "TOP_RESULTS"}
            >
              <option value="GOOGLE">Google (Search + Scraping)</option>
              <option value="CHATGPT">ChatGPT (AI Generated)</option>
              <option value="GEMINI">Gemini (AI Generated)</option>
            </select>
            <p className="text-xs text-white/40 mt-1">
              {formData.promptType === "TOP_RESULTS" 
                ? "Select the data source for top results (required for TOP_RESULTS)"
                : "Select the primary data source for this prompt (optional for other types)"}
            </p>
          </div>
          <div>
            <label className="block text-white mb-2">Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-accent-purple"
              placeholder="e.g., Intent Classification"
              required
            />
          </div>
          <div>
            <label className="block text-white mb-2">Description</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-accent-purple"
              placeholder="Brief description of what this prompt does"
            />
          </div>
          <div>
            <label className="block text-white mb-2">Template *</label>
            <textarea
              value={formData.template}
              onChange={(e) => setFormData({ ...formData, template: e.target.value })}
              className="w-full h-48 px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-accent-purple font-mono text-sm"
              placeholder="Enter your prompt template with placeholders like {keyword}, {location}, etc."
              required
            />
            <p className="text-xs text-white/40 mt-1">Use curly braces for placeholders: {"{keyword}"}, {"{location}"}, etc.</p>
          </div>

          {/* TO DO: Remove any placeholders from the template on frontend and backend */}
          {/* <div>
            <label className="block text-white mb-2">Placeholders (comma-separated)</label>
            <input
              type="text"
              value={formData.placeholders}
              onChange={(e) => setFormData({ ...formData, placeholders: e.target.value })}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-accent-purple"
              placeholder="e.g., keyword, location, store, query, top_ranking_html"
            />
            <p className="text-xs text-white/40 mt-1">List all placeholders used in your template</p>
          </div> */}
          <div className="flex justify-end gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-accent-purple hover:bg-accent-purple/80 text-white rounded-lg transition-colors"
            >
              Create Prompt
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
