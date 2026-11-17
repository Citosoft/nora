import type { RemoteService, RequestFailure } from "@/types/http.types";

const subject: Record<RemoteService, string> = {
  runtime: "your computer",
  directory: "Nora's account service"
};

/** Turns a typed request failure into a sentence a non-developer can act on. */
export function describeFailure<TCode extends string>(service: RemoteService, failure: RequestFailure<TCode>): string {
  switch (failure.kind) {
    case "signed-out":
      return "You're signed out. Sign in again to continue.";
    case "timeout":
      return service === "runtime"
        ? "Your computer took too long to answer. It may be asleep, offline or busy."
        : "Nora's account service took too long to answer. Try again in a moment.";
    case "network":
      return service === "runtime"
        ? "Couldn't reach your computer. Check that it's on, awake and online with Nora running."
        : "Couldn't reach Nora's account service. Check your connection and try again.";
    case "invalid-response":
      return `Got an unexpected reply from ${subject[service]}. Updating Nora on both devices usually fixes this.`;
    case "http":
      return failure.status >= 500
        ? `${capitalize(subject[service])} had a problem (error ${failure.status}). Try again in a moment.`
        : `The request was refused (error ${failure.status}).`;
    case "api":
      return describeApiCode(service, failure.code, failure.message);
  }
}

function describeApiCode(service: RemoteService, code: string, message: string): string {
  switch (code) {
    case "unauthenticated":
      return "Your sign-in has expired. Sign in again to continue.";
    case "forbidden":
      return service === "runtime"
        ? "This computer belongs to a different Nora account, or remote access was turned off on it."
        : "That isn't allowed for your account.";
    case "not-found":
      return service === "runtime" ? "That item no longer exists on your computer." : "That computer is no longer linked to your account.";
    case "rate-limited":
      return "Too many requests right now. Wait a moment and try again.";
    case "unavailable":
      return "Remote access is paused on your computer, or Nora is shutting down.";
    case "cursor-unavailable":
      return "Some updates are no longer available; reloading the latest state.";
    case "too-large":
      return "That message is too long to send.";
    case "quota":
      return "Your account already has the maximum number of linked computers.";
    case "upstream":
    case "internal":
      return `${capitalize(subject[service])} had a problem. Try again in a moment.`;
    default:
      // `invalid`, `conflict` and `expired` carry the server's specific explanation.
      return message;
  }
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
