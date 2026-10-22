import type {
  AuthLoginResult,
  AuthSelectableProfile,
  AuthUser,
  SessionInfo,
} from "@teka/shared";
import { apiRequest, ApiError } from "./api-client";
import { appConfig } from "./config";
import { clearSessionToken, getSessionToken, setSessionToken } from "./session";

type LoginApiResponse = {
  token?: string;
  access_token?: string;
  token_expires_at?: string;
  user?: AuthUser;
  requires_profile_selection?: boolean;
  profiles?: AuthSelectableProfile[];
  message?: string;
  data?: {
    token?: string;
    access_token?: string;
    token_expires_at?: string;
    user?: AuthUser;
  };
};

function extractToken(payload: LoginApiResponse): string | null {
  return (
    payload.token ||
    payload.access_token ||
    payload.data?.token ||
    payload.data?.access_token ||
    null
  );
}

function extractUser(payload: LoginApiResponse): AuthUser | null {
  return payload.user ?? payload.data?.user ?? null;
}

export function getSessionInfo(): SessionInfo {
  return {
    authenticated: Boolean(getSessionToken()),
    apiConfigured: Boolean(appConfig.apiBaseUrl),
    apiBaseUrl: appConfig.apiBaseUrl || null,
  };
}

export async function login(
  loginId: string,
  password: string,
  userId?: string,
): Promise<AuthLoginResult> {
  // Comme le mobile / API : champ `login` = email OU téléphone
  const payload = await apiRequest<LoginApiResponse>("/api/auth/login", {
    method: "POST",
    auth: false,
    body: {
      login: loginId.trim(),
      password,
      ...(userId ? { user_id: userId } : {}),
    },
  });

  if (payload.requires_profile_selection && payload.profiles) {
    return {
      status: "profile_selection",
      profiles: payload.profiles,
      message: payload.message,
    };
  }

  const token = extractToken(payload);
  if (!token) {
    throw new Error("Aucun token reçu du serveur");
  }

  setSessionToken(token);
  const user = extractUser(payload) ?? (await fetchMe());

  return {
    status: "authenticated",
    user,
  };
}

export async function fetchMe(): Promise<AuthUser> {
  const payload = await apiRequest<AuthUser | { user?: AuthUser; data?: AuthUser }>(
    "/api/auth/me",
    { method: "GET" },
  );
  if (payload && typeof payload === "object" && "email" in payload && "id" in payload) {
    return payload as AuthUser;
  }
  if (payload && typeof payload === "object") {
    const nested =
      ("user" in payload ? payload.user : undefined) ??
      ("data" in payload ? payload.data : undefined);
    if (nested?.id && nested.email) return nested;
  }
  throw new Error("Profil utilisateur invalide");
}

export async function logout(): Promise<void> {
  try {
    if (getSessionToken()) {
      await apiRequest("/api/auth/logout", { method: "POST" });
    }
  } catch (err) {
    if (!(err instanceof ApiError)) {
      console.warn("[auth] logout upstream failed", err);
    }
  } finally {
    clearSessionToken();
  }
}

export async function restoreSession(): Promise<AuthUser | null> {
  if (!getSessionToken() || !appConfig.apiBaseUrl) return null;
  try {
    return await fetchMe();
  } catch {
    clearSessionToken();
    return null;
  }
}
