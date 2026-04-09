import { useState } from "react";
import { api, setToken } from "@/lib/api";

interface AuthProps {
  onAuth: (user: User) => void;
}

export interface User {
  id: number;
  name: string;
  phone: string;
  username: string | null;
  bio: string;
  avatar_letter: string;
  avatar_color: string;
  online: boolean;
}

type Mode = "login" | "register";

export default function Auth({ onAuth }: AuthProps) {
  const [mode, setMode] = useState<Mode>("login");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function formatPhone(val: string) {
    const digits = val.replace(/\D/g, "");
    if (!digits) return "";
    let result = "+";
    if (digits.length >= 1) result += digits.slice(0, 1);
    if (digits.length >= 2) result += " " + digits.slice(1, 4);
    if (digits.length >= 5) result += " " + digits.slice(4, 7);
    if (digits.length >= 8) result += "-" + digits.slice(7, 9);
    if (digits.length >= 10) result += "-" + digits.slice(9, 11);
    return result;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!phone || !password) {
      setError("Заполните все обязательные поля");
      return;
    }

    if (mode === "register") {
      if (!name.trim()) { setError("Введите имя"); return; }
      if (password.length < 6) { setError("Пароль минимум 6 символов"); return; }
      if (password !== confirm) { setError("Пароли не совпадают"); return; }
    }

    setLoading(true);
    try {
      let data;
      if (mode === "login") {
        data = await api.login(phone, password);
      } else {
        data = await api.register(phone, name.trim(), password, username.trim() || undefined);
      }
      setToken(data.token);
      onAuth(data.user);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "#17212b",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'Golos Text', sans-serif",
      padding: "16px",
    }}>
      <div style={{
        width: "100%",
        maxWidth: "380px",
        background: "#1c2733",
        borderRadius: "16px",
        padding: "32px 28px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div style={{
            width: "64px", height: "64px",
            background: "linear-gradient(135deg, #2ea6ff, #0073e6)",
            borderRadius: "20px",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 14px",
            fontSize: "28px",
          }}>💬</div>
          <h1 style={{ color: "#fff", fontSize: "22px", fontWeight: 700, margin: 0 }}>MyCat Messenger</h1>
          <p style={{ color: "#7c8d9e", fontSize: "14px", marginTop: "6px" }}>
            {mode === "login" ? "Войдите в свой аккаунт" : "Создайте новый аккаунт"}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Name - only register */}
          {mode === "register" && (
            <div style={{ marginBottom: "14px" }}>
              <label style={{ display: "block", color: "#7c8d9e", fontSize: "12px", marginBottom: "6px", fontWeight: 500 }}>
                Имя *
              </label>
              <input
                type="text"
                placeholder="Ваше имя"
                value={name}
                onChange={e => setName(e.target.value)}
                style={inputStyle}
              />
            </div>
          )}

          {/* Phone */}
          <div style={{ marginBottom: "14px" }}>
            <label style={{ display: "block", color: "#7c8d9e", fontSize: "12px", marginBottom: "6px", fontWeight: 500 }}>
              Номер телефона *
            </label>
            <input
              type="tel"
              placeholder="+7 900 000-00-00"
              value={phone}
              onChange={e => setPhone(formatPhone(e.target.value))}
              style={inputStyle}
            />
          </div>

          {/* Username - only register */}
          {mode === "register" && (
            <div style={{ marginBottom: "14px" }}>
              <label style={{ display: "block", color: "#7c8d9e", fontSize: "12px", marginBottom: "6px", fontWeight: 500 }}>
                Никнейм (необязательно)
              </label>
              <input
                type="text"
                placeholder="@username"
                value={username}
                onChange={e => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
                style={inputStyle}
              />
              <p style={{ color: "#4a5a6a", fontSize: "11px", marginTop: "4px" }}>
                Только латинские буквы, цифры и _
              </p>
            </div>
          )}

          {/* Password */}
          <div style={{ marginBottom: "14px" }}>
            <label style={{ display: "block", color: "#7c8d9e", fontSize: "12px", marginBottom: "6px", fontWeight: 500 }}>
              Пароль *
            </label>
            <input
              type="password"
              placeholder={mode === "register" ? "Минимум 6 символов" : "Ваш пароль"}
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* Confirm password */}
          {mode === "register" && (
            <div style={{ marginBottom: "14px" }}>
              <label style={{ display: "block", color: "#7c8d9e", fontSize: "12px", marginBottom: "6px", fontWeight: 500 }}>
                Подтвердите пароль *
              </label>
              <input
                type="password"
                placeholder="Повторите пароль"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                style={inputStyle}
              />
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{
              background: "#3d1a1a", border: "1px solid #7c2020",
              borderRadius: "8px", padding: "10px 12px",
              color: "#ff6b6b", fontSize: "13px", marginBottom: "14px",
            }}>
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%", padding: "13px",
              background: loading ? "#1a3a5c" : "linear-gradient(135deg, #2ea6ff, #0073e6)",
              border: "none", borderRadius: "10px",
              color: "#fff", fontSize: "15px", fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              transition: "all 0.2s",
              marginBottom: "16px",
            }}
          >
            {loading ? "Загрузка..." : mode === "login" ? "Войти" : "Зарегистрироваться"}
          </button>

          {/* Switch mode */}
          <p style={{ textAlign: "center", color: "#7c8d9e", fontSize: "14px", margin: 0 }}>
            {mode === "login" ? "Нет аккаунта? " : "Уже есть аккаунт? "}
            <span
              onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}
              style={{ color: "#2ea6ff", cursor: "pointer", fontWeight: 600 }}
            >
              {mode === "login" ? "Зарегистрироваться" : "Войти"}
            </span>
          </p>
        </form>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "11px 14px",
  background: "#0e1621",
  border: "1px solid #1e2d3d",
  borderRadius: "10px",
  color: "#d1d5db",
  fontSize: "14px",
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.2s",
  fontFamily: "'Golos Text', sans-serif",
};
