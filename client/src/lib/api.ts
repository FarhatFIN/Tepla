const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api/v2";

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  private async request<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };
    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }
    const res = await fetch(`${API_BASE}${path}`, { ...options, headers, credentials: "include" });
    if (res.status === 401 && retry && path !== "/auth/refresh") {
      const refreshed = await this.refreshToken();
      if (refreshed) {
        return this.request<T>(path, options, false);
      }
      this.setToken(null);
      try {
        localStorage.removeItem("tepla-auth");
      } catch { /* ignore */ }
      if (typeof window !== "undefined" && window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(err?.error?.message || err.message || `HTTP ${res.status}`);
    }
    return res.json();
  }

  private async refreshToken(): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({}),
      });
      if (!res.ok) return false;
      const payload = await res.json();
      const token = payload?.data?.accessToken || payload?.data?.token || payload?.data?.tokens?.accessToken;
      if (token) this.setToken(token);
      return Boolean(token);
    } catch {
      return false;
    }
  }

  get<T>(path: string) { return this.request<T>(path); }
  post<T>(path: string, body?: unknown) { return this.request<T>(path, { method: "POST", body: JSON.stringify(body) }); }
  patch<T>(path: string, body?: unknown) { return this.request<T>(path, { method: "PATCH", body: JSON.stringify(body) }); }
  put<T>(path: string, body?: unknown) { return this.request<T>(path, { method: "PUT", body: JSON.stringify(body) }); }
  delete<T>(path: string) { return this.request<T>(path, { method: "DELETE" }); }

  async upload<T>(path: string, file: File, fields?: Record<string, string>): Promise<T> {
    const form = new FormData();
    form.append("file", file);
    if (fields) Object.entries(fields).forEach(([k, v]) => form.append(k, v));
    const headers: Record<string, string> = {};
    if (this.token) headers["Authorization"] = `Bearer ${this.token}`;
    const res = await fetch(`${API_BASE}${path}`, { method: "POST", headers, body: form, credentials: "include" });
    if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
    return res.json();
  }
}

export const api = new ApiClient();
export default api;
