export type SteeringResult = { status: "accepted" } | { status: "rejected" | "unconfirmed"; message: string };
