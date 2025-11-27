import { createAuthClient } from "better-auth/react";
import {
  adminClient,
  apiKeyClient,
  deviceAuthorizationClient,
  organizationClient,
  usernameClient,
} from "better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [
    usernameClient(),
    adminClient(),
    organizationClient(),
    apiKeyClient(),
    deviceAuthorizationClient(),
  ],
});

export const { useSession, useActiveOrganization, signIn, signUp, signOut } = authClient;
