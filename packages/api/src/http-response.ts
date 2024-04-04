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

export function internalServerError(message: string): HttpResponseInit {
  return {
    status: 500,
    jsonBody: {
      error: message,
    },
  };
}

export function unauthorized(message: string): HttpResponseInit {
  return {
    status: 401,
    jsonBody: {
      error: message,
    },
  };
}

export function noContent(): HttpResponseInit {
  return {
    status: 204,
  };
}

export function created(body: Record<string, unknown>): HttpResponseInit {
  return {
    status: 201,
    jsonBody: body,
  };
}

export function ok(body: Record<string, unknown>): HttpResponseInit {
  return {
    status: 200,
    jsonBody: body,
  };
}
