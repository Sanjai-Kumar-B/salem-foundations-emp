import { auth } from '@/lib/firebase';

const JSON_HEADERS = {
  'Content-Type': 'application/json',
};

async function getAuthHeader(): Promise<Record<string, string>> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('You must be signed in to perform this action.');
  }

  const token = await currentUser.getIdToken();
  return {
    Authorization: `Bearer ${token}`,
  };
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const body = await response.json();
      if (body?.error) {
        message = body.error;
      }
    } catch {
      // Keep default message when body is not json.
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export async function apiGet<T>(path: string): Promise<T> {
  const authHeader = await getAuthHeader();
  const response = await fetch(path, {
    method: 'GET',
    headers: {
      ...JSON_HEADERS,
      ...authHeader,
    },
    cache: 'no-store',
  });

  return parseResponse<T>(response);
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const authHeader = await getAuthHeader();
  const response = await fetch(path, {
    method: 'POST',
    headers: {
      ...JSON_HEADERS,
      ...authHeader,
    },
    body: JSON.stringify(body),
  });

  return parseResponse<T>(response);
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  const authHeader = await getAuthHeader();
  const response = await fetch(path, {
    method: 'PATCH',
    headers: {
      ...JSON_HEADERS,
      ...authHeader,
    },
    body: JSON.stringify(body),
  });

  return parseResponse<T>(response);
}

export async function apiDelete<T>(path: string): Promise<T> {
  const authHeader = await getAuthHeader();
  const response = await fetch(path, {
    method: 'DELETE',
    headers: {
      ...JSON_HEADERS,
      ...authHeader,
    },
  });

  return parseResponse<T>(response);
}
