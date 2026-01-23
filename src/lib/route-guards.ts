/**
 * Route guards and validation utilities
 */

import { NextRequest, NextResponse } from "next/server";
import { isValidSlug, parseServicePath } from "./slug-utils";

/**
 * Validate dynamic route parameters for service-related routes
 */
export function validateServiceRoute(params: { serviceSlug: string }): { isValid: boolean; error?: NextResponse } {
  if (!params.serviceSlug) {
    return {
      isValid: false,
      error: NextResponse.json({ error: "Service slug is required" }, { status: 400 })
    };
  }

  if (!isValidSlug(params.serviceSlug)) {
    return {
      isValid: false,
      error: NextResponse.json({ error: "Invalid service slug format" }, { status: 400 })
    };
  }

  return { isValid: true };
}

/**
 * Validate dynamic route parameters for sub-service-related routes
 */
export function validateSubServiceRoute(params: { subServiceSlug: string }): { isValid: boolean; error?: NextResponse } {
  if (!params.subServiceSlug) {
    return {
      isValid: false,
      error: NextResponse.json({ error: "Sub-service slug is required" }, { status: 400 })
    };
  }

  if (!isValidSlug(params.subServiceSlug)) {
    return {
      isValid: false,
      error: NextResponse.json({ error: "Invalid sub-service slug format" }, { status: 400 })
    };
  }

  return { isValid: true };
}

/**
 * Validate dynamic route parameters for service-subservice routes
 */
export function validateServiceSubServiceRoute(params: { serviceSlug: string; subServiceSlug: string }): { isValid: boolean; error?: NextResponse } {
  const serviceValidation = validateServiceRoute({ serviceSlug: params.serviceSlug });
  if (!serviceValidation.isValid) return serviceValidation;

  const subServiceValidation = validateSubServiceRoute({ subServiceSlug: params.subServiceSlug });
  if (!subServiceValidation.isValid) return subServiceValidation;

  return { isValid: true };
}