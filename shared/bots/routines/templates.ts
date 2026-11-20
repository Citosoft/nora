import type { RoutineTemplate } from "@shared/types/bots/routines.types";
import { CORE_ROUTINES } from "./templates/core";
import { ENGINEERING_ROUTINES } from "./templates/engineering";
import { PRODUCT_ROUTINES } from "./templates/product";
import { BUSINESS_ROUTINES } from "./templates/business";
import { COMMUNICATION_ROUTINES } from "./templates/communication";

export const ROUTINE_TEMPLATES: readonly RoutineTemplate[] = [
  ...CORE_ROUTINES,
  ...ENGINEERING_ROUTINES,
  ...PRODUCT_ROUTINES,
  ...BUSINESS_ROUTINES,
  ...COMMUNICATION_ROUTINES
];
