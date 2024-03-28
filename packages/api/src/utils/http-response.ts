import { HttpResponseInit } from '@azure/functions';

export function badRequest(error: Error): HttpResponseInit {
  return {
    status: 400,
    jsonBody: {
      error: error.message,
    },
  };
}

export function notFound(error: Error): HttpResponseInit {
  return {
    status: 404,
    jsonBody: {
      error: error.message,
    },
  };
}

export function serviceUnavailable(error: Error): HttpResponseInit {
  return {
    status: 503,
    jsonBody: {
      error: error.message,
    },
  };
}

export function internalServerError(error: Error): HttpResponseInit {
  return {
    status: 500,
    jsonBody: {
      error: error.message,
    },
  };
}

export function unauthorized(error: Error): HttpResponseInit {
  return {
    status: 401,
    jsonBody: {
      error: error.message,
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
