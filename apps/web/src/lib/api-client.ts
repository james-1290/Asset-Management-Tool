import { redirectToLogin } from "@/lib/auth-urls";

const BASE_URL = "/api/v1";

// Authentication rides on the platform's session cookie (Azure App Service
// built-in auth), so requests carry credentials instead of an Authorization
// header. Same-origin: the SPA and API are served from one origin by design.
const CREDENTIALS: RequestCredentials = "same-origin";

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError && error.body && typeof error.body === "object" && "error" in error.body) {
    return (error.body as { error: string }).error;
  }
  return fallback;
}

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
  // 401 means the session has gone (expired or signed out elsewhere) — send
  // the user back through sign-in. A 403 is deliberately NOT handled here: the
  // caller is signed in and simply isn't allowed, so redirecting would loop.
  if (response.status === 401) {
    redirectToLogin();
    throw new ApiError(401, "Unauthorized");
  }

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
  // Some 200/201 responses have an empty body (endpoints typed Promise<void>).
  // Calling response.json() on those throws; read text and only parse if present.
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export const apiClient = {
  get<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
    let url = `${BASE_URL}${path}`;
    if (params) {
      const searchParams = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== "") {
          searchParams.set(key, String(value));
        }
      }
      const qs = searchParams.toString();
      if (qs) url += `?${qs}`;
    }
    return fetch(url, { credentials: CREDENTIALS }).then(handleResponse<T>);
  },

  post<T>(path: string, body: unknown): Promise<T> {
    return fetch(`${BASE_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: CREDENTIALS,
      body: JSON.stringify(body),
    }).then(handleResponse<T>);
  },

  put<T>(path: string, body: unknown): Promise<T> {
    return fetch(`${BASE_URL}${path}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: CREDENTIALS,
      body: JSON.stringify(body),
    }).then(handleResponse<T>);
  },

  delete<T = void>(path: string): Promise<T> {
    return fetch(`${BASE_URL}${path}`, {
      method: "DELETE",
      credentials: CREDENTIALS,
    }).then(handleResponse<T>);
  },

  uploadFile<T>(path: string, file: File, fieldName = "file"): Promise<T> {
    const formData = new FormData();
    formData.append(fieldName, file);
    return fetch(`${BASE_URL}${path}`, {
      method: "POST",
      credentials: CREDENTIALS,
      body: formData,
    }).then(handleResponse<T>);
  },

  async downloadCsv(path: string, params?: Record<string, string | number | undefined>, filename?: string): Promise<void> {
    let url = `${BASE_URL}${path}`;
    if (params) {
      const searchParams = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== "") {
          searchParams.set(key, String(value));
        }
      }
      const qs = searchParams.toString();
      if (qs) url += `?${qs}`;
    }

    const response = await fetch(url, { credentials: CREDENTIALS });

    if (response.status === 401) {
      redirectToLogin();
      throw new ApiError(401, "Unauthorized");
    }

    if (!response.ok) {
      throw new ApiError(response.status, response.statusText);
    }

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = filename ?? "export.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(objectUrl);
  },
};
