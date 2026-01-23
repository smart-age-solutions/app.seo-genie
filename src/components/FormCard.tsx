"use client";

import { ReactNode } from "react";

interface FormCardProps {
  children: ReactNode;
  onSubmit: (e: React.FormEvent) => void;
}

export function FormCard({ children, onSubmit }: FormCardProps) {
  return (
    <div className="form-card">
      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        {children}
      </form>
    </div>
  );
}

interface FormFieldProps {
  label: string;
  children: ReactNode;
  className?: string;
}

export function FormField({ label, children, className = "" }: FormFieldProps) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <label className="text-gray-800 text-center italic font-medium">
        {label}
      </label>
      {children}
    </div>
  );
}

interface FormRowProps {
  children: ReactNode;
}

export function FormRow({ children }: FormRowProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {children}
    </div>
  );
}
