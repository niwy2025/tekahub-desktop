import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type ReactNode,
} from "react";
import type { AppLocale, AuthSelectableProfile, ConnectionSettingsView } from "@teka/shared";
import logo from "../assets/teka-hub-logo.svg";
import { useAutoFocus } from "../keyboard/useAutoFocus";
import { t } from "../i18n/messages";
import { LanguageSwitch } from "./LanguageSwitch";

type Props = {
  locale: AppLocale;
  onLocaleChange: (locale: AppLocale) => void;
  apiConfigured: boolean;
  apiBaseUrl: string | null;
  onConnectionSaved: () => Promise<void>;
  onLogin: (
    loginId: string,
    password: string,
    userId?: string,
  ) => Promise<"ok" | "profiles">;
  profiles: AuthSelectableProfile[];
  onClearProfiles: () => void;
};

export function LoginScreen({
  locale,
  onLocaleChange,
  apiConfigured,
  apiBaseUrl,
  onConnectionSaved,
  onLogin,
  profiles,
  onClearProfiles,
}: Props) {
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const loginRef = useRef<HTMLInputElement>(null);
  useAutoFocus(loginRef);

  async function submit(event: FormEvent, userId?: string) {
    event.preventDefault();
    if (!apiConfigured) {
      setError(t(locale, "apiMissing"));
      setSettingsOpen(true);
      return;
    }
    if (!loginId.trim() || !password) {
      setError(t(locale, "fillAllFields"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onLogin(loginId.trim(), password, userId);
    } catch (err) {
      setError(err instanceof Error ? err.message : t(locale, "loginError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100%",
        display: "grid",
        placeItems: "center",
        padding: 32,
        position: "relative",
      }}
    >
      <div style={{ width: "100%", maxWidth: 440 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginBottom: 12,
          }}
        >
          <LanguageSwitch locale={locale} onChange={onLocaleChange} />
        </div>

        <div style={{ marginBottom: 28 }}>
          <img src={logo} alt="TekaHub" style={{ height: 48, width: "auto" }} />
          <p
            style={{
              margin: "18px 0 0",
              fontSize: 12,
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              color: "var(--tek-ash)",
            }}
          >
            {t(locale, "appTag")}
          </p>
          <h1 style={{ margin: "8px 0 0", fontSize: 32, fontWeight: 650 }}>
            {t(locale, "loginTitle")}
          </h1>
          <p style={{ margin: "10px 0 0", color: "var(--tek-ash)", fontSize: 14 }}>
            {t(locale, "loginSubtitle")}
          </p>
        </div>

        {!apiConfigured ? (
          <div
            style={{
              marginBottom: 16,
              padding: 14,
              borderRadius: 16,
              border: "1px solid var(--tek-line)",
              background: "rgba(192, 38, 38, 0.06)",
              color: "var(--tek-danger)",
              fontSize: 13,
            }}
          >
            {t(locale, "apiMissingHint")}
          </div>
        ) : null}

        <form
          onSubmit={(e) => void submit(e)}
          style={{ display: "flex", flexDirection: "column", gap: 14 }}
        >
          <Field label={t(locale, "loginIdentifier")}>
            <input
              ref={loginRef}
              type="text"
              inputMode="email"
              autoComplete="username"
              value={loginId}
              placeholder={t(locale, "loginIdentifierPlaceholder")}
              disabled={busy}
              onChange={(e) => {
                setLoginId(e.target.value);
                onClearProfiles();
                setSelectedProfileId(null);
              }}
              style={inputStyle}
              required
            />
          </Field>
          <Field label={t(locale, "password")}>
            <input
              type="password"
              value={password}
              autoComplete="current-password"
              placeholder={t(locale, "passwordPlaceholder")}
              disabled={busy}
              onChange={(e) => {
                setPassword(e.target.value);
                onClearProfiles();
                setSelectedProfileId(null);
              }}
              style={inputStyle}
              required
            />
          </Field>

          {error ? (
            <p style={{ margin: 0, color: "var(--tek-danger)", fontSize: 13 }}>{error}</p>
          ) : null}

          <button type="submit" disabled={busy || !apiConfigured} style={primaryBtn}>
            {busy ? t(locale, "signingIn") : t(locale, "signIn")}
          </button>
        </form>

        {profiles.length > 0 ? (
          <div
            style={{
              marginTop: 18,
              padding: 16,
              borderRadius: 16,
              border: "1px solid var(--tek-line)",
              background: "var(--tek-card)",
              boxShadow: "var(--tek-shadow)",
            }}
          >
            <div
              style={{
                fontSize: 11,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "var(--tek-ash)",
              }}
            >
              {t(locale, "chooseProfile")}
            </div>
            <p style={{ margin: "8px 0 12px", fontSize: 13, color: "var(--tek-ash)" }}>
              {t(locale, "chooseProfileHint")}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {profiles.map((profile) => (
                <button
                  key={profile.id}
                  type="button"
                  onClick={() => setSelectedProfileId(profile.id)}
                  style={{
                    ...inputStyle,
                    textAlign: "left",
                    borderColor:
                      selectedProfileId === profile.id ? "var(--tek-black)" : "var(--tek-line)",
                    background:
                      selectedProfileId === profile.id
                        ? "rgba(244, 198, 15, 0.2)"
                        : "var(--tek-bg)",
                  }}
                >
                  <strong>{profile.name ?? profile.email ?? profile.id}</strong>
                  {profile.entreprise?.nom ? (
                    <div style={{ color: "var(--tek-ash)", fontSize: 12, marginTop: 2 }}>
                      {profile.entreprise.nom}
                    </div>
                  ) : null}
                </button>
              ))}
            </div>
            <button
              type="button"
              disabled={busy || !selectedProfileId}
              style={{ ...primaryBtn, marginTop: 12 }}
              onClick={(e) => {
                if (!selectedProfileId) return;
                void submit(e, selectedProfileId);
              }}
            >
              {t(locale, "continueProfile")}
            </button>
          </div>
        ) : null}
      </div>

      <button
        type="button"
        aria-label={t(locale, "connectionOpenSettings")}
        title={t(locale, "connectionOpenSettings")}
        onClick={() => setSettingsOpen(true)}
        style={gearBtn}
      >
        <GearIcon />
      </button>

      {settingsOpen ? (
        <ConnectionSettingsModal
          locale={locale}
          apiBaseUrl={apiBaseUrl}
          onClose={() => setSettingsOpen(false)}
          onSaved={async () => {
            await onConnectionSaved();
          }}
        />
      ) : null}
    </div>
  );
}

function ConnectionSettingsModal({
  locale,
  apiBaseUrl,
  onClose,
  onSaved,
}: {
  locale: AppLocale;
  apiBaseUrl: string | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const titleId = useId();
  const [apiDraft, setApiDraft] = useState(apiBaseUrl ?? "");
  const [connection, setConnection] = useState<ConnectionSettingsView | null>(null);
  const [savingApi, setSavingApi] = useState(false);
  const [apiSavedMsg, setApiSavedMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (typeof window.teka?.getConnectionSettings !== "function") return;
    void window.teka
      .getConnectionSettings()
      .then((next) => {
        setConnection(next);
        setApiDraft(next.apiBaseUrl ?? next.effectiveApiBaseUrl);
      })
      .catch(() => {
        /* ignore */
      });
  }, [locale]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function saveApiUrl() {
    if (savingApi || !apiDraft.trim()) return;
    setSavingApi(true);
    setApiSavedMsg(null);
    setError(null);
    try {
      const next = await window.teka.setConnectionSettings({ apiBaseUrl: apiDraft.trim() });
      setConnection(next);
      setApiDraft(next.apiBaseUrl ?? next.effectiveApiBaseUrl);
      setApiSavedMsg(t(locale, "connectionSaved"));
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSavingApi(false);
    }
  }

  const envLocked = Boolean(connection?.fromEnv);

  return (
    <div
      role="presentation"
      style={modalBackdrop}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={modalCard}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start" }}>
          <div>
            <h2 id={titleId} style={{ margin: 0, fontSize: 18, fontWeight: 650 }}>
              {t(locale, "connectionSection")}
            </h2>
            <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--tek-ash)", lineHeight: 1.45 }}>
              {t(locale, "connectionHint")}
            </p>
          </div>
          <button type="button" onClick={onClose} style={iconCloseBtn} aria-label={t(locale, "connectionClose")}>
            ×
          </button>
        </div>

        {envLocked ? (
          <p style={{ margin: "14px 0 0", fontSize: 12, color: "var(--tek-ash)", lineHeight: 1.45 }}>
            {t(locale, "connectionEnvOverride")}
          </p>
        ) : null}

        <label style={{ display: "grid", gap: 6, marginTop: 16 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 650,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "var(--tek-ash)",
            }}
          >
            {t(locale, "connectionApiUrl")}
          </span>
          <input
            ref={inputRef}
            type="url"
            value={apiDraft}
            disabled={savingApi || envLocked}
            placeholder={t(locale, "connectionApiPlaceholder")}
            onChange={(e) => setApiDraft(e.target.value)}
            style={inputStyle}
          />
        </label>

        <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
          <button
            type="button"
            disabled={savingApi || envLocked || !apiDraft.trim()}
            onClick={() => void saveApiUrl()}
            style={{ ...primaryBtn, width: "auto", padding: "10px 18px", boxShadow: "none" }}
          >
            {savingApi ? t(locale, "loading") : t(locale, "connectionSave")}
          </button>
          <button type="button" onClick={onClose} style={ghostBtn}>
            {t(locale, "connectionClose")}
          </button>
        </div>

        {apiSavedMsg ? (
          <p style={{ margin: "12px 0 0", fontSize: 13, color: "#15803d" }}>{apiSavedMsg}</p>
        ) : null}
        {error ? (
          <p style={{ margin: "12px 0 0", fontSize: 13, color: "var(--tek-danger)" }}>{error}</p>
        ) : null}
      </div>
    </div>
  );
}

function GearIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M19.4 13.5a7.7 7.7 0 0 0 .05-1.5l2.05-1.6-1.9-3.3-2.45.55a7.8 7.8 0 0 0-1.3-.75L15.5 3.5h-3.8l-.35 2.4c-.46.2-.9.45-1.3.75l-2.45-.55-1.9 3.3 2.05 1.6c-.04.5-.04 1 .05 1.5l-2.05 1.6 1.9 3.3 2.45-.55c.4.3.84.55 1.3.75l.35 2.4h3.8l.35-2.4c.46-.2.9-.45 1.3-.75l2.45.55 1.9-3.3-2.05-1.6Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label
      style={{
        display: "block",
        borderRadius: 16,
        border: "1px solid var(--tek-line)",
        background: "var(--tek-bg)",
        padding: 14,
      }}
    >
      <span
        style={{
          display: "block",
          fontSize: 11,
          fontWeight: 650,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: "var(--tek-ash)",
        }}
      >
        {label}
      </span>
      <div style={{ marginTop: 8 }}>{children}</div>
    </label>
  );
}

const inputStyle: CSSProperties = {
  width: "100%",
  border: "1px solid var(--tek-line)",
  borderRadius: 10,
  padding: "10px 12px",
  background: "var(--tek-card)",
  color: "var(--tek-ink)",
  outline: "none",
};

const ghostBtn: CSSProperties = {
  border: "1px solid var(--tek-line)",
  background: "transparent",
  color: "var(--tek-ink)",
  padding: "8px 14px",
  borderRadius: 999,
  fontWeight: 650,
  fontSize: 13,
  cursor: "pointer",
  alignSelf: "flex-start",
};

const primaryBtn: CSSProperties = {
  width: "100%",
  border: "none",
  borderRadius: 999,
  padding: "12px 18px",
  background: "var(--tek-yellow)",
  color: "var(--tek-black)",
  fontWeight: 700,
  fontSize: 15,
  boxShadow: "0 14px 35px rgba(244, 198, 15, 0.28)",
  cursor: "pointer",
};

const gearBtn: CSSProperties = {
  position: "fixed",
  left: 20,
  bottom: 20,
  width: 44,
  height: 44,
  borderRadius: 12,
  border: "1px solid var(--tek-line)",
  background: "var(--tek-card)",
  color: "var(--tek-ash)",
  display: "grid",
  placeItems: "center",
  cursor: "pointer",
  boxShadow: "var(--tek-shadow)",
};

const modalBackdrop: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(15, 23, 42, 0.45)",
  display: "grid",
  placeItems: "center",
  padding: 24,
  zIndex: 50,
};

const modalCard: CSSProperties = {
  width: "100%",
  maxWidth: 420,
  background: "var(--tek-card)",
  border: "1px solid var(--tek-line)",
  borderRadius: 18,
  padding: 22,
  boxShadow: "0 24px 60px rgba(15, 23, 42, 0.22)",
};

const iconCloseBtn: CSSProperties = {
  border: "none",
  background: "transparent",
  color: "var(--tek-ash)",
  fontSize: 24,
  lineHeight: 1,
  cursor: "pointer",
  padding: 4,
};
