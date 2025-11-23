import { createAuthClient } from "better-auth/react";
import {
  adminClient,
  apiKeyClient,
  deviceAuthorizationClient,
  organizationClient,
} from "better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [
    adminClient(),
    organizationClient(),
    apiKeyClient(),
    deviceAuthorizationClient(),
  ],
});

export const { useSession, useActiveOrganization, signIn, signOut } = authClient;
