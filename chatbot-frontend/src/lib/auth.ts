// ─── Configuration ───

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8001";

// ─── Types ───

export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: string;
  token: string;
  getIdToken: (forceRefresh?: boolean) => Promise<string>;
}

export interface ChatSession {
  session_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  created_at?: string;
}

// ─── Token / Storage Helpers ───

function getStoredToken(): string | null {
  return sessionStorage.getItem("student_token");
}

function setStoredToken(token: string) {
  sessionStorage.setItem("student_token", token);
}

function clearStoredToken() {
  sessionStorage.removeItem("student_token");
  sessionStorage.removeItem("student_user");
}

function storeUser(user: User) {
  const serializable = {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    token: user.token,
  };
  sessionStorage.setItem("student_user", JSON.stringify(serializable));
}

function loadStoredUser(): User | null {
  const raw = sessionStorage.getItem("student_user");
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return {
      ...parsed,
      getIdToken: async () => parsed.token,
    };
  } catch {
    return null;
  }
}

// ─── Auth Headers ───

function authHeaders(): Record<string, string> {
  const token = getStoredToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const headers: Record<string, string> = {
    ...authHeaders(),
    ...(options.headers as Record<string, string> || {}),
  };
  if (options.body && typeof options.body === "string") {
    headers["Content-Type"] = "application/json";
  }
  return fetch(`${API_BASE}${path}`, { ...options, headers });
}

// ─── Observable Auth State ───

let currentUser: User | null = loadStoredUser();
const authListeners: ((user: User | null) => void)[] = [];

function notifyAuthChange() {
  authListeners.forEach((fn) => fn(currentUser));
}

export const auth = {
  get currentUser() {
    return currentUser;
  },
  onAuthStateChanged: (callback: (user: User | null) => void) => {
    authListeners.push(callback);
    callback(currentUser);
    return () => {
      const idx = authListeners.indexOf(callback);
      if (idx > -1) authListeners.splice(idx, 1);
    };
  },
};

// ─── Auth Functions ───

export async function loginUser(email: string, password: string): Promise<User> {
  const res = await fetch(`${API_BASE}/api/v1/student/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || "Invalid email or password");
  }

  const data = await res.json();
  const user: User = {
    uid: data.uid,
    email: data.email,
    displayName: data.display_name || data.email.split("@")[0],
    role: data.role || "student",
    token: data.token,
    getIdToken: async () => data.token,
  };

  setStoredToken(data.token);
  storeUser(user);
  currentUser = user;
  notifyAuthChange();
  return user;
}

export async function registerUser(
  email: string,
  password: string,
  displayName?: string
): Promise<User> {
  const res = await fetch(`${API_BASE}/api/v1/student/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, display_name: displayName, name: displayName }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || "Registration failed");
  }

  const data = await res.json();
  const user: User = {
    uid: data.uid,
    email: data.email,
    displayName: data.display_name || data.email.split("@")[0],
    role: data.role || "student",
    token: data.token,
    getIdToken: async () => data.token,
  };

  setStoredToken(data.token);
  storeUser(user);
  currentUser = user;
  notifyAuthChange();
  return user;
}

export async function loginWithGoogle(): Promise<User> {
  throw new Error("Google sign-in is not available. Please use email/password.");
}

export async function logoutUser(): Promise<void> {
  currentUser = null;
  clearStoredToken();
  notifyAuthChange();
}

export function onAuthChange(callback: (user: User | null) => void): () => void {
  // On init, try to validate stored token
  if (currentUser) {
    apiFetch("/api/v1/auth/me")
      .then(async (res) => {
        if (!res.ok) {
          // Token expired or invalid
          currentUser = null;
          clearStoredToken();
          notifyAuthChange();
        }
      })
      .catch(() => {
        // Network error — keep user logged in (offline tolerance)
      });
  }
  return auth.onAuthStateChanged(callback);
}

// ─── Token Helper ───

export async function getIdToken(): Promise<string | null> {
  return getStoredToken();
}

// ─── Session API ───

export async function fetchSessions(): Promise<ChatSession[]> {
  const res = await apiFetch("/api/v1/sessions");
  if (!res.ok) return [];
  const data = await res.json();
  return data.sessions || [];
}

export async function createSession(): Promise<ChatSession> {
  const res = await apiFetch("/api/v1/sessions", { method: "POST" });
  if (!res.ok) throw new Error("Failed to create session");
  const data = await res.json();
  return {
    session_id: data.session_id,
    title: data.title || "New Chat",
    created_at: data.created_at || new Date().toISOString(),
    updated_at: data.updated_at || data.created_at || new Date().toISOString(),
    message_count: 0,
  };
}

export async function fetchSessionMessages(sessionId: string): Promise<ChatMessage[]> {
  const res = await apiFetch(`/api/v1/sessions/${sessionId}/messages`);
  if (!res.ok) return [];
  const data = await res.json();
  return (data.messages || []).map((m: { role: string; content: string; ts?: string }) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
    created_at: m.ts,
  }));
}

// ─── Stream Query ───

export function streamQueryUrl(): string {
  return `${API_BASE}/api/v1/query/stream`;
}

// ─── Profile ───

export interface UserProfile {
  semester: string;
  stream: string;
  batch: string;
  rollNumber: string;
}

export async function fetchProfile(): Promise<UserProfile | null> {
  const res = await apiFetch("/api/v1/profile");
  if (!res.ok) return null;
  const data = await res.json();
  return {
    semester: data.sem || "",
    stream: data.stream || "",
    batch: "",
    rollNumber: data.roll || "",
  };
}

export async function updateProfileName(name: string): Promise<boolean> {
  const res = await apiFetch("/api/v1/profile", {
    method: "PATCH",
    body: JSON.stringify({ display_name: name, name }),
  });
  if (res.ok && currentUser) {
    currentUser.displayName = name;
    storeUser(currentUser);
    notifyAuthChange();
  }
  return res.ok;
}

// ─── Documents ───

export interface DocumentInfo {
  document_id: string;
  source: string;
  title: string | null;
  semester: string | null;
  stream: string | null;
  subject: string | null;
  chunks: number;
  preview_url?: string | null;
  created_at: string;
}

export async function fetchDocuments(): Promise<DocumentInfo[]> {
  const res = await apiFetch("/api/v1/documents");
  if (!res.ok) throw new Error("Failed to fetch documents");
  const data = await res.json();
  return (data.documents || []).map((doc: Record<string, unknown>) => ({
    document_id: doc.document_id as string,
    source: (doc.source as string) || "",
    title: (doc.title as string) || null,
    semester: (doc.semester as string) || null,
    stream: (doc.stream as string) || null,
    subject: (doc.subject as string) || null,
    chunks: (doc.chunks as number) || 0,
    preview_url: (doc.preview_url as string) || null,
    created_at: (doc.created_at as string) || new Date().toISOString(),
  }));
}

export async function fetchPreviewUrl(documentId: string): Promise<string> {
  const res = await apiFetch(`/api/v1/documents/${documentId}/preview`);
  if (!res.ok) throw new Error("Failed to fetch preview URL");
  const data = await res.json();
  return data.preview_url;
}

export async function downloadDocument(documentId: string, filename: string): Promise<void> {
  const res = await apiFetch(`/api/v1/documents/${documentId}/file`);
  if (!res.ok) throw new Error("Failed to download file");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Quiz Generation ───

export interface QuizOption {
  label: string; // "A", "B", "C", "D"
  text: string;
}

export interface QuizQuestion {
  id: number;
  question: string;
  options: QuizOption[];
  correct_option: string; // "A", "B", "C", or "D"
  explanation: string;
}

export interface QuizResponse {
  quiz_id: string;
  subject: string;
  num_questions: number;
  questions: QuizQuestion[];
  generated_at: string;
  context_chunks_used: number;
}

export async function generateQuiz(
  subject: string | null,
  numQuestions: number,
  documentId?: string
): Promise<QuizResponse> {
  const body: Record<string, unknown> = {
    subject: subject || "All Subjects",
    num_questions: numQuestions,
  };
  if (documentId) body.document_id = documentId;

  const res = await apiFetch("/api/v1/quiz/generate", {
    method: "POST",
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || "Quiz generation failed");
  }

  return res.json();
}

export interface QuizHistoryEntry {
  quiz_id: string;
  subject: string;
  score: number;
  total_questions: number;
  percentage: number;
  submitted_at: string;
}

export async function submitQuiz(
  quizId: string,
  subject: string,
  score: number,
  totalQuestions: number
): Promise<boolean> {
  const res = await apiFetch("/api/v1/quiz/submit", {
    method: "POST",
    body: JSON.stringify({
      quiz_id: quizId,
      subject,
      score,
      total_questions: totalQuestions,
    }),
  });
  return res.ok;
}

export async function getQuizHistory(): Promise<QuizHistoryEntry[]> {
  const res = await apiFetch("/api/v1/quiz/history");
  if (!res.ok) return [];
  const data = await res.json();
  return data.history || [];
}
