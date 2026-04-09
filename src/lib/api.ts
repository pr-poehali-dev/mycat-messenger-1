const API_URL = "https://functions.poehali.dev/d197146a-d56a-4aa7-816a-43d4a39dddd2";

export function getToken() {
  return localStorage.getItem("messenger_token");
}

export function setToken(token: string) {
  localStorage.setItem("messenger_token", token);
}

export function removeToken() {
  localStorage.removeItem("messenger_token");
}

async function request(method: string, path: string, body?: unknown, params?: Record<string, string>) {
  const url = new URL(API_URL + path);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }

  const token = getToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(url.toString(), {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Ошибка сервера");
  }
  return data;
}

export const api = {
  // Auth
  register: (phone: string, name: string, password: string, username?: string) =>
    request("POST", "/auth/register", { phone, name, password, username }),
  login: (phone: string, password: string) =>
    request("POST", "/auth/login", { phone, password }),
  logout: () => request("POST", "/auth/logout"),
  me: () => request("GET", "/auth/me"),

  // Users
  searchUsers: (q: string) => request("GET", "/users/search", undefined, { q }),
  updateProfile: (data: { name?: string; username?: string; bio?: string }) =>
    request("PATCH", "/users/me", data),

  // Chats
  getChats: () => request("GET", "/chats"),
  openPrivateChat: (userId: number) =>
    request("POST", "/chats/private", { user_id: userId }),

  // Messages
  getMessages: (chatId: number, since?: string) =>
    request("GET", `/chats/${chatId}/messages`, undefined, since ? { since } : undefined),
  sendMessage: (chatId: number, text: string) =>
    request("POST", `/chats/${chatId}/messages`, { text }),
};