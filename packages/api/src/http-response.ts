import { HttpResponseInit } from '@azure/functions';

export function badRequest(message: string): HttpResponseInit {
  return {
    status: 400,
    jsonBody: {
      error: message,
    },
  };
}

export function notFound(message: string): HttpResponseInit {
  return {
    status: 404,
    jsonBody: {
      error: message,
    },
  };
}

export function serviceUnavailable(message: string): HttpResponseInit {
  return {
    status: 503,
    jsonBody: {
      error: message,
    },
  };
}

export function ok(body?: object): HttpResponseInit {
  return body
    ? {
        status: 200,
        jsonBody: body,
      }
    : { status: 204 };
}

export function data(body: Uint8Array | AsyncIterable<Uint8Array>, headers: Record<string, string>): HttpResponseInit {
  return {
    status: 200,
    headers,
    body,
  };
}
