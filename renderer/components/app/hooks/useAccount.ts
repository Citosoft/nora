import { useEffect, useState } from "react";
import { accountClient } from "@/components/app/clients/accountClient";
import type { AccountState } from "@shared/types/account/account.types";

export function useAccount(): AccountState {
  const [state, setState] = useState<AccountState>({ status: "loading" });
  useEffect(() => {
    let current = true;
    let pushed = false;
    const unsubscribe = accountClient.onChanged((next) => { pushed = true; if (current) setState(next); });
    void accountClient.read().then((next) => { if (current && !pushed) setState(next); }).catch(() => {
      if (current && !pushed) setState({ status: "error", message: "Your account could not be loaded. Try opening it again." });
    });
    return () => { current = false; unsubscribe(); };
  }, []);
  return state;
}
