import { NextResponse } from "next/server";
import { HttpError } from "./errors";
import { errorMessage } from "./utils";

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/** Wraps a route handler so thrown errors become JSON responses instead of HTML error pages. */
export function handle<T extends unknown[]>(fn: (...args: T) => Promise<Response>) {
  return async (...args: T): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (e) {
      if (e instanceof HttpError) return jsonError(e.message, e.status);
      console.error(e);
      return jsonError(errorMessage(e), 500);
    }
  };
}
