import type { RemoteService, RequestFailure } from "@/types/http.types";
import { describeFailure } from "./describeFailure";

/** A failed runtime or control-plane request; `message` is already user-meaningful. */
export class RemoteRequestError<TCode extends string = string> extends Error {
  readonly service: RemoteService;
  readonly failure: RequestFailure<TCode>;

  constructor(service: RemoteService, failure: RequestFailure<TCode>) {
    super(describeFailure(service, failure));
    this.name = "RemoteRequestError";
    this.service = service;
    this.failure = failure;
  }

  /** The API error code, when the server answered with the error envelope. */
  get code(): TCode | null {
    return this.failure.kind === "api" ? this.failure.code : null;
  }
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Something went wrong.";
}
