"use client";

import { useState, useEffect } from "react";
import { Toast, ConfirmModal } from "@/components";
import { backendApi } from "@/lib/backend-api";

interface SubService {
  id: string;
  slug: string;
  name: string;
  formFields: FormField[];
}

interface FormField {
  id: string;
  fieldId: string;
  label: string;
  placeholder: string | null;
  helpText: string | null;
  fieldType: string;
  fieldLayout: string;
  isRequired: boolean;
  isActive: boolean;
  sortOrder: number;
}

interface FormFieldInput {
  fieldId: string;
  label: string;
  placeholder?: string;
  helpText?: string;
  fieldType: string;
  fieldLayout: string;
  isRequired: boolean;
  isActive: boolean;
  sortOrder: number;
}

export default function FormsAdminPage() {
  const [subServices, setSubServices] = useState<SubService[]>([]);
  const [selectedSubService, setSelectedSubService] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [showFieldModal, setShowFieldModal] = useState(false);
  const [editingField, setEditingField] = useState<FormField | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; fieldId: string | null; fieldLabel: string }>({
    isOpen: false,
    fieldId: null,
    fieldLabel: "",
  });
  const [fieldForm, setFieldForm] = useState<FormFieldInput>({
    fieldId: "",
    label: "",
    placeholder: "",
    helpText: "",
    fieldType: "TEXT",
    fieldLayout: "FULL",
    isRequired: false,
    isActive: true,
    sortOrder: 0,
  });

  useEffect(() => {
    fetchSubServices();
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const fetchSubServices = async () => {
    try {
      setIsLoading(true);
      const services = await backendApi.services.getAll();
      
      // Flatten all sub-services from all services
      const allSubServices: SubService[] = [];
      for (const service of services) {
        const subServices = await backendApi.subServices.getAll(service.id);
        for (const subService of subServices) {
          // Fetch form fields for each sub-service
          const formFields = await backendApi.formFields.getBySubService(subService.id, true);
          allSubServices.push({
            ...subService,
            formFields: formFields || [],
          });
        }
      }
      setSubServices(allSubServices);
    } catch (error) {
      console.error("Error fetching sub-services:", error);
      setToast({ 
        message: error instanceof Error ? error.message : "Error loading sub-services", 
        type: "error" 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const openAddFieldModal = () => {
    const selectedService = subServices.find((s) => s.id === selectedSubService);
    if (!selectedService) return;

    setEditingField(null);
    setFieldForm({
      fieldId: "",
      label: "",
      placeholder: "",
      helpText: "",
      fieldType: "TEXT",
      fieldLayout: "FULL",
      isRequired: false,
      isActive: true,
      sortOrder: selectedService.formFields.length,
    });
    setShowFieldModal(true);
  };

  const openEditFieldModal = (field: FormField) => {
    setEditingField(field);
    setFieldForm({
      fieldId: field.fieldId,
      label: field.label,
      placeholder: field.placeholder || "",
      helpText: field.helpText || "",
      fieldType: field.fieldType,
      fieldLayout: field.fieldLayout,
      isRequired: field.isRequired,
      isActive: field.isActive,
      sortOrder: field.sortOrder,
    });
    setShowFieldModal(true);
  };

  const closeFieldModal = () => {
    setShowFieldModal(false);
    setEditingField(null);
  };

  const handleSaveField = async () => {
    if (!selectedSubService) {
      setToast({ message: "Please select a sub-service first", type: "error" });
      return;
    }

    // Validation
    if (!fieldForm.fieldId.trim() || !fieldForm.label.trim()) {
      setToast({ message: "Field ID and Label are required", type: "error" });
      return;
    }

    try {
      let updatedField;
      if (editingField) {
        // Update existing field
        updatedField = await backendApi.formFields.update(editingField.id, fieldForm);
      } else {
        // Create new field
        updatedField = await backendApi.formFields.create(selectedSubService, fieldForm);
      }

      setToast({
        message: editingField ? "Field updated successfully" : "Field created successfully",
        type: "success",
      });
      closeFieldModal();
      
      // Update local state immediately for better UX
      if (selectedSubService) {
        if (editingField) {
          // Update existing field in state
          setSubServices((prev) =>
            prev.map((subService) =>
              subService.id === selectedSubService
                ? {
                    ...subService,
                    formFields: subService.formFields.map((f) =>
                      f.id === editingField.id ? { ...f, ...updatedField } : f
                    ),
                  }
                : subService
            )
          );
        } else {
          // Add new field to state
          setSubServices((prev) =>
            prev.map((subService) =>
              subService.id === selectedSubService
                ? {
                    ...subService,
                    formFields: [...subService.formFields, updatedField],
                  }
                : subService
            )
          );
        }
      }
      
      // Also refetch to ensure consistency
      await fetchSubServices();
    } catch (error) {
      console.error("Error saving field:", error);
      const errorMessage = error instanceof Error ? error.message : "Error saving field";
      setToast({ 
        message: errorMessage, 
        type: "error" 
      });
      // Don't close modal on error so user can fix and retry
    }
  };

  const handleDeleteField = (fieldId: string) => {
    // Find field in all sub-services (not just selected one, in case selection changed)
    let field: FormField | undefined;
    for (const subService of subServices) {
      field = subService.formFields.find((f) => f.id === fieldId);
      if (field) break;
    }
    
    setDeleteConfirm({
      isOpen: true,
      fieldId,
      fieldLabel: field?.label || "this field",
    });
  };

  const confirmDeleteField = async () => {
    if (!deleteConfirm.fieldId) return;

    const fieldIdToDelete = deleteConfirm.fieldId;
    const fieldLabelToDelete = deleteConfirm.fieldLabel;

    try {
      await backendApi.formFields.delete(fieldIdToDelete);
      setToast({ message: `Field "${fieldLabelToDelete}" deleted successfully`, type: "success" });
      
      // Update local state immediately for better UX
      if (selectedSubService) {
        setSubServices((prev) =>
          prev.map((subService) =>
            subService.id === selectedSubService
              ? {
                  ...subService,
                  formFields: subService.formFields.filter(
                    (f) => f.id !== fieldIdToDelete
                  ),
                }
              : subService
          )
        );
      }
      
      // Also refetch to ensure consistency
      await fetchSubServices();
      
      setDeleteConfirm({ isOpen: false, fieldId: null, fieldLabel: "" });
    } catch (error) {
      console.error("Error deleting field:", error);
      setToast({ 
        message: error instanceof Error ? error.message : "Error deleting field", 
        type: "error" 
      });
      // Don't close modal on error so user can see the error message
    }
  };

  const selectedService = subServices.find((s) => s.id === selectedSubService);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Form Builder</h1>
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {isLoading ? (
        <div className="text-center py-12">
          <div className="text-white/70">Loading...</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Service selection */}
          <div className="lg:col-span-1">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Select Sub-Service</h2>
              <div className="space-y-2">
                {subServices.map((subService) => (
                  <button
                    key={subService.id}
                    onClick={() => setSelectedSubService(subService.id)}
                    className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                      selectedSubService === subService.id
                        ? "bg-accent-purple text-white"
                        : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <div className="font-medium">{subService.name}</div>
                    <div className="text-sm opacity-70">
                      {subService.formFields.length} field{subService.formFields.length !== 1 ? "s" : ""}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Form fields */}
          <div className="lg:col-span-2">
            {selectedService ? (
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-white">
                    Form Fields for {selectedService.name}
                  </h2>
                  <button
                    onClick={openAddFieldModal}
                    className="px-4 py-2 bg-accent-purple hover:bg-accent-purple/80 text-white rounded-lg transition-colors"
                  >
                    + Add Field
                  </button>
                </div>

                {selectedService.formFields.length === 0 ? (
                  <div className="text-center py-12 text-white/50">
                    No form fields configured yet.
                    <br />
                    Click &quot;Add Field&quot; to create your first field.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {selectedService.formFields
                      .sort((a, b) => a.sortOrder - b.sortOrder)
                      .map((field) => (
                        <div
                          key={field.id}
                          className="bg-white/5 rounded-lg p-4 flex items-start justify-between"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-white font-medium">{field.label}</span>
                              {field.isRequired && (
                                <span className="text-xs px-2 py-1 bg-red-500/20 text-red-300 rounded">
                                  Required
                                </span>
                              )}
                              {!field.isActive && (
                                <span className="text-xs px-2 py-1 bg-gray-500/20 text-gray-300 rounded">
                                  Disabled
                                </span>
                              )}
                              <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-300 rounded font-mono">
                                {`{${field.fieldId}}`}
                              </span>
                            </div>
                            <div className="text-sm text-white/60">
                              Type: {field.fieldType} • Layout: {field.fieldLayout}
                            </div>
                            {field.placeholder && (
                              <div className="text-sm text-white/50 mt-1">
                                Placeholder: {field.placeholder}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openEditFieldModal(field)}
                              className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded transition-colors"
                              title="Edit field"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDeleteField(field.id)}
                              className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
                              title="Delete field"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 text-center py-12">
                <div className="text-white/50">
                  Select a sub-service to manage its form fields
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        title="Delete Field"
        message={`Are you sure you want to delete "${deleteConfirm.fieldLabel}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={confirmDeleteField}
        onCancel={() => setDeleteConfirm({ isOpen: false, fieldId: null, fieldLabel: "" })}
      />

      {/* Add/Edit Field Modal */}
      {showFieldModal && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-[150] p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeFieldModal();
          }}
        >
          <div className="bg-[#1a1a2e] border border-purple-500/30 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl shadow-purple-500/20 relative">
            <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 border-b border-purple-500/30 p-6">
              <h2 className="text-2xl font-bold text-white">
                {editingField ? "Edit Field" : "Add New Field"}
              </h2>
            </div>
            
            <div className="overflow-y-auto max-h-[calc(90vh-200px)] bg-[#1a1a2e]">
              <div className="p-6 space-y-4">
              {/* Field ID */}
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Field ID <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={fieldForm.fieldId}
                  onChange={(e) => setFieldForm({ ...fieldForm, fieldId: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") })}
                  placeholder="e.g., phone_number"
                  disabled={!!editingField}
                  className="w-full px-4 py-2 bg-gray-800/80 border border-purple-500/30 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <p className="mt-1 text-xs text-white/50">
                  Used in prompts as {`{${fieldForm.fieldId || "field_id"}}`}. Cannot be changed after creation.
                </p>
              </div>

              {/* Label */}
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Label <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={fieldForm.label}
                  onChange={(e) => setFieldForm({ ...fieldForm, label: e.target.value })}
                  placeholder="e.g., Phone Number"
                  className="w-full px-4 py-2 bg-gray-800/80 border border-purple-500/30 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                />
              </div>

              {/* Field Type */}
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Field Type
                </label>
                <select
                  value={fieldForm.fieldType}
                  onChange={(e) => setFieldForm({ ...fieldForm, fieldType: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-800/80 border border-purple-500/30 rounded-lg text-white focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                >
                  <option value="TEXT">Text</option>
                  <option value="EMAIL">Email</option>
                  <option value="URL">URL</option>
                  <option value="NUMBER">Number</option>
                  <option value="TEXTAREA">Text Area</option>
                  <option value="SELECT">Select</option>
                  <option value="CHECKBOX">Checkbox</option>
                </select>
              </div>

              {/* Field Layout */}
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Field Layout
                </label>
                <select
                  value={fieldForm.fieldLayout}
                  onChange={(e) => setFieldForm({ ...fieldForm, fieldLayout: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-800/80 border border-purple-500/30 rounded-lg text-white focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                >
                  <option value="FULL">Full Width</option>
                  <option value="HALF">Half Width</option>
                </select>
              </div>

              {/* Placeholder */}
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Placeholder
                </label>
                <input
                  type="text"
                  value={fieldForm.placeholder}
                  onChange={(e) => setFieldForm({ ...fieldForm, placeholder: e.target.value })}
                  placeholder="e.g., Enter your phone number"
                  className="w-full px-4 py-2 bg-gray-800/80 border border-purple-500/30 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                />
              </div>

              {/* Help Text */}
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Help Text
                </label>
                <input
                  type="text"
                  value={fieldForm.helpText}
                  onChange={(e) => setFieldForm({ ...fieldForm, helpText: e.target.value })}
                  placeholder="Additional help or instructions"
                  className="w-full px-4 py-2 bg-gray-800/80 border border-purple-500/30 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                />
              </div>

              {/* Sort Order */}
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Sort Order
                </label>
                <input
                  type="number"
                  value={fieldForm.sortOrder}
                  onChange={(e) => setFieldForm({ ...fieldForm, sortOrder: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 bg-gray-800/80 border border-purple-500/30 rounded-lg text-white focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                />
              </div>

              {/* Checkboxes */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-white/80">
                  <input
                    type="checkbox"
                    checked={fieldForm.isRequired}
                    onChange={(e) => setFieldForm({ ...fieldForm, isRequired: e.target.checked })}
                    className="w-4 h-4 rounded border-purple-500/30 bg-gray-800/80 text-purple-500 focus:ring-2 focus:ring-purple-500/20"
                  />
                  <span>Required field</span>
                </label>

                <label className="flex items-center gap-2 text-white/80">
                  <input
                    type="checkbox"
                    checked={fieldForm.isActive}
                    onChange={(e) => setFieldForm({ ...fieldForm, isActive: e.target.checked })}
                    className="w-4 h-4 rounded border-purple-500/30 bg-gray-800/80 text-purple-500 focus:ring-2 focus:ring-purple-500/20"
                  />
                  <span>Active (visible in form)</span>
                </label>
              </div>
            </div>

            </div>

            <div className="bg-[#1a1a2e] border-t border-purple-500/30 p-6 flex justify-end gap-3">
              <button
                onClick={closeFieldModal}
                className="px-6 py-2 bg-gray-700/50 hover:bg-gray-700 text-white rounded-lg transition-colors border border-gray-600/50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveField}
                className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-lg transition-all shadow-lg shadow-purple-500/30"
              >
                {editingField ? "Update Field" : "Create Field"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
