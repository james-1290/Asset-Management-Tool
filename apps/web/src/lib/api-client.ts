const BASE_URL = "/api/v1";

export class ApiError extends Error {
  status: number;
  statusText: string;
  body?: unknown;

  constructor(status: number, statusText: string, body?: unknown) {
    super(`${status} ${statusText}`);
    this.name = "ApiError";
    this.status = status;
    this.statusText = statusText;
    this.body = body;
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      // no JSON body
    }
    throw new ApiError(response.status, response.statusText, body);
  }

  if (response.status === 204) return undefined as T;
  return response.json();
}

export const apiClient = {
  get<T>(path: string): Promise<T> {
    return fetch(`${BASE_URL}${path}`).then(handleResponse<T>);
  },

  post<T>(path: string, body: unknown): Promise<T> {
    return fetch(`${BASE_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then(handleResponse<T>);
  },

  put<T>(path: string, body: unknown): Promise<T> {
    return fetch(`${BASE_URL}${path}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then(handleResponse<T>);
  },

  delete<T = void>(path: string): Promise<T> {
    return fetch(`${BASE_URL}${path}`, {
      method: "DELETE",
    }).then(handleResponse<T>);
  },
};
