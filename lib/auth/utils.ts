import { User } from "better-auth";

/**
 * Checks if the given user is the root user based on environment variables.
 * checks against ROOT_USER_EMAIL and optionally ROOT_USER_ID if available.
 */
export function isRootUser(user: User | null | undefined): boolean {
  if (!user) return false;
  
  const rootEmail = process.env.ROOT_USER_EMAIL;
  const rootId = process.env.ROOT_USER_ID;

  if (rootEmail && user.email === rootEmail) {
    return true;
  }

  if (rootId && user.id === rootId) {
    return true;
  }

  return false;
}
