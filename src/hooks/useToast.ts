"use client";

import { useState, useCallback } from "react";
import type { ToastType } from "@/components/Toast";

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((message: string, type: ToastType = "info") => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showError = useCallback((message: string) => addToast(message, "error"), [addToast]);
  const showSuccess = useCallback((message: string) => addToast(message, "success"), [addToast]);
  const showWarning = useCallback((message: string) => addToast(message, "warning"), [addToast]);
  const showInfo = useCallback((message: string) => addToast(message, "info"), [addToast]);

  return {
    toasts,
    addToast,
    removeToast,
    showError,
    showSuccess,
    showWarning,
    showInfo,
  };
}
