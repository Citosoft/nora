/** What an alert's expressions produced for the current rows. */
export type AppAlertEvaluation = { active: false } | { active: true; title: string; detail: string | null; key: string };

/** An alert that is firing, as stored: the occurrence key tells a new report from a repeat of the same one. */
export interface AppAlertState { alertId: string; key: string; title: string; detail: string | null; firedAt: string; }
