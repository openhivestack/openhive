import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Generates a DID (Decentralized Identifier) for OpenHive resources.
 * Format: {registry}:{classification}:{uuid}
 * Example: hive:agent:123e4567-e89b-12d3-a456-426614174000
 */
export function generateDid(
  registry: string = "openhive",
  classification: string = "agent",
  id?: string
): string {
  // Use crypto.randomUUID() if available (Node 14.17+ / Browsers), otherwise fallback
  const uuid =
    id ||
    (typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).substring(2, 15));
  return `${registry}:${classification}:${uuid}`;
}
