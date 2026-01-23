/**
 * Frontend Type Definitions
 * 
 * AUTO-GENERATED from backend Prisma schema.
 * Do not edit manually - run "npm run sync-types" to update.
 * 
 * Source: backend/prisma/schema.prisma
 * Generated: 2026-01-23T09:55:02.364Z
 */

export enum UserRole {
  ADMIN = "ADMIN",
  MANAGER = "MANAGER",
  SELLER = "SELLER",
}

export enum UserStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  BLOCKED = "BLOCKED",
  REJECTED = "REJECTED",
}

export enum PromptType {
  TOP_RESULTS = "TOP_RESULTS",
  INTENT = "INTENT",
  BLUEPRINT = "BLUEPRINT",
  CUSTOM = "CUSTOM",
}

export enum DataSource {
  GOOGLE = "GOOGLE",
  CHATGPT = "CHATGPT",
  GEMINI = "GEMINI",
  CUSTOM = "CUSTOM",
}

export enum FieldType {
  TEXT = "TEXT",
  TEXTAREA = "TEXTAREA",
  NUMBER = "NUMBER",
  EMAIL = "EMAIL",
  URL = "URL",
  SELECT = "SELECT",
  CHECKBOX = "CHECKBOX",
  RADIO = "RADIO",
  DATE = "DATE",
  CUSTOM = "CUSTOM",
}

export enum FieldLayout {
  FULL = "FULL",
  HALF = "HALF",
  THIRD = "THIRD",
}

export interface User {
  id: string;
  name: string | null;
  email: string | null;
  emailVerified: Date | null;
  image: string | null;
  password: string | null;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
  loginCount: number;
  approvedById: string | null;
  approvedAt: Date | null;
}

export interface OrganizationSettings {
  id: string;
  allowedEmailDomain: string | null;
  requireDomainMatch: boolean;
  autoApproveMatchingDomain: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AISettings {
  id: string;
  aiProvider: string;
  aiModel: string;
  temperature: number;
  maxTokens: number;
  apiKey: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface GoogleSettings {
  id: string;
  oauthClientId: string | null;
  oauthClientSecret: string | null;
  searchApiKey: string | null;
  searchEngineId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Service {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  image: string | null;
  images: string[];
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubService {
  id: string;
  serviceId: string;
  slug: string;
  name: string;
  subtitle: string | null;
  description: string | null;
  icon: string | null;
  image: string | null;
  routePath: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ServicePrompt {
  id: string;
  subServiceId: string;
  slug: string;
  name: string;
  description: string | null;
  promptType: PromptType;
  dataSource: DataSource | null;
}

export interface PromptTemplate {
  id: string;
  name: string;
  description: string | null;
  prompt: string;
  isActive: boolean;
  version: number;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  targetType: string;
  targetId: string | null;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
}

export interface FormField {
  id: string;
  subServiceId: string;
  fieldId: string;
  label: string;
  placeholder: string | null;
  helpText: string | null;
  fieldType: FieldType;
  fieldLayout: FieldLayout;
  isRequired: boolean;
  isActive: boolean;
  minLength: number | null;
  maxLength: number | null;
  pattern: string | null;
  options: Record<string, unknown> | null;
}

