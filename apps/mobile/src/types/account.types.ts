import type { TokenProvider } from "./http.types";

export interface AppAccount {
  status: "loading" | "signed-out" | "signed-in" | "demo";
  userId: string | null;
  user: { fullName: string | null; email: string | null; imageUrl: string | null } | null;
  getToken: TokenProvider;
  signOut(): Promise<void>;
}
