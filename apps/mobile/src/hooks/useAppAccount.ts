import { useContext } from "react";
import { AccountContext } from "@/context/accountContext";

export function useAppAccount() {
  const account = useContext(AccountContext);
  if (!account) throw new Error("Account context is missing.");
  return account;
}
