import { useEffect, useState } from "react";

/**
 * True from the first time a surface is shown, and stays true afterwards. Lets kept-mounted hidden tabs defer
 * expensive runtime discovery until someone looks at them, without repeating it on every tab switch.
 */
export function useOnceVisible(visible: boolean): boolean {
  const [seen, setSeen] = useState(visible);
  useEffect(() => { if (visible) setSeen(true); }, [visible]);
  return seen || visible;
}
