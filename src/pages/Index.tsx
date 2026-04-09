import { useState, useRef, useEffect, useCallback } from "react";
import { api, removeToken } from "@/lib/api";
import type { User } from "./Auth";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ChatItem {
  id: number;
  type: "private" | "group" | "channel";
  name: string;
  avatar_letter: string;
  avatar_color: string;
  last_message?: string;
  last_message_time?: string;
  unread_count: number;
  members_count: number;
  other_user?: {
    id: number;
    name: string;
    username: string | null;
    online: boolean;
    last_seen: string;
    avatar_letter: string;
    avatar_color: string;
  };
}

interface Message {
  id: number;
  chat_id: number;
  sender_id: number;
  text: string;
  created_at: string;
  sender_name: string;
  sender_avatar: string;
  sender_color: string;
}

interface SearchUser {
  id: number;
  name: string;
  username: string | null;
  phone: string;
  avatar_letter: string;
  avatar_color: string;
  online: boolean;
}

interface IndexProps {
  user: User;
  onLogout: () => void;
}

type Section = "chats" | "search" | "profile" | "settings";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return d.toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" });
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "вчера";
  return d.toLocaleDateString("ru", { day: "numeric", month: "short" });
}

function formatFull(iso: string) {
  return new Date(iso).toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" });
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function Index({ user, onLogout }: IndexProps) {
  const [section, setSection] = useState<Section>("chats");
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [activeChatId, setActiveChatId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingChats, setLoadingChats] = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [profileName, setProfileName] = useState(user.name);
  const [profileUsername, setProfileUsername] = useState(user.username || "");
  const [profileBio, setProfileBio] = useState(user.bio || "");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [currentUser, setCurrentUser] = useState<User>(user);
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastMsgTimeRef = useRef<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chatsPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const activeChat = chats.find(c => c.id === activeChatId);

  // ── Load chats ──────────────────────────────────────────────────────────────
  const loadChats = useCallback(async () => {
    try {
      const data = await api.getChats();
      setChats(data.chats || []);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    setLoadingChats(true);
    loadChats().finally(() => setLoadingChats(false));
    chatsPollRef.current = setInterval(loadChats, 5000);
    return () => { if (chatsPollRef.current) clearInterval(chatsPollRef.current); };
  }, [loadChats]);

  // ── Load messages ───────────────────────────────────────────────────────────
  const loadMessages = useCallback(async (chatId: number, initial = false) => {
    try {
      if (initial) {
        setLoadingMsgs(true);
        const data = await api.getMessages(chatId);
        setMessages(data.messages || []);
        const msgs = data.messages || [];
        if (msgs.length > 0) {
          lastMsgTimeRef.current = msgs[msgs.length - 1].created_at;
        } else {
          lastMsgTimeRef.current = null;
        }
        setLoadingMsgs(false);
      } else {
        // Poll for new messages
        if (!lastMsgTimeRef.current) {
          const data = await api.getMessages(chatId);
          const msgs = data.messages || [];
          setMessages(msgs);
          if (msgs.length > 0) lastMsgTimeRef.current = msgs[msgs.length - 1].created_at;
          return;
        }
        const data = await api.getMessages(chatId, lastMsgTimeRef.current);
        const newMsgs: Message[] = data.messages || [];
        if (newMsgs.length > 0) {
          setMessages(prev => [...prev, ...newMsgs]);
          lastMsgTimeRef.current = newMsgs[newMsgs.length - 1].created_at;
          // Refresh chats to update last message
          loadChats();
        }
      }
    } catch {
      if (initial) setLoadingMsgs(false);
    }
  }, [loadChats]);

  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (!activeChatId) return;
    loadMessages(activeChatId, true);
    pollRef.current = setInterval(() => loadMessages(activeChatId, false), 2000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [activeChatId, loadMessages]);

  // ── Auto scroll ─────────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Send message ────────────────────────────────────────────────────────────
  async function sendMessage() {
    if (!inputText.trim() || !activeChatId || sending) return;
    const text = inputText.trim();
    setInputText("");
    setSending(true);
    try {
      const data = await api.sendMessage(activeChatId, text);
      const msg: Message = data.message;
      setMessages(prev => [...prev, msg]);
      lastMsgTimeRef.current = msg.created_at;
      loadChats();
    } catch {
      setInputText(text);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  // ── Open chat ───────────────────────────────────────────────────────────────
  function openChat(chatId: number) {
    setActiveChatId(chatId);
    setMessages([]);
    lastMsgTimeRef.current = null;
    setMobileView("chat");
    // Mark as read in local state
    setChats(prev => prev.map(c => c.id === chatId ? { ...c, unread_count: 0 } : c));
  }

  // ── Search users ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (searchQuery.length < 2) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const data = await api.searchUsers(searchQuery);
        setSearchResults(data.users || []);
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  async function startChatWithUser(userId: number) {
    try {
      const data = await api.openPrivateChat(userId);
      await loadChats();
      setSection("chats");
      setSearchQuery("");
      setSearchResults([]);
      openChat(data.chat_id);
    } catch {
      // ignore
    }
  }

  // ── Save profile ────────────────────────────────────────────────────────────
  async function saveProfile() {
    setProfileError("");
    setProfileSuccess(false);
    setProfileSaving(true);
    try {
      const data = await api.updateProfile({
        name: profileName,
        username: profileUsername || undefined,
        bio: profileBio,
      });
      setCurrentUser(data.user);
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (err: unknown) {
      setProfileError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setProfileSaving(false);
    }
  }

  // ── Logout ───────────────────────────────────────────────────────────────────
  async function handleLogout() {
    await api.logout().catch(() => {});
    removeToken();
    onLogout();
  }

  // ── Render helpers ──────────────────────────────────────────────────────────
  const navItems: { id: Section; icon: string; label: string }[] = [
    { id: "chats", icon: "💬", label: "Чаты" },
    { id: "search", icon: "🔍", label: "Поиск" },
    { id: "profile", icon: "👤", label: "Профиль" },
    { id: "settings", icon: "⚙️", label: "Настройки" },
  ];

  const totalUnread = chats.reduce((sum, c) => sum + Number(c.unread_count), 0);

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div style={{
      display: "flex",
      height: "100vh",
      background: "#17212b",
      fontFamily: "'Golos Text', sans-serif",
      overflow: "hidden",
    }}>

      {/* ── LEFT SIDEBAR ─────────────────────────────────────────────────────── */}
      <div style={{
        width: "340px",
        minWidth: "340px",
        background: "#0e1621",
        borderRight: "1px solid #1e2d3d",
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        ...(mobileView === "chat" ? { display: "none" } as React.CSSProperties : {}),
      }} className="sidebar-panel">
        {/* Top nav */}
        <div style={{
          display: "flex",
          alignItems: "center",
          padding: "0 8px",
          height: "56px",
          borderBottom: "1px solid #1e2d3d",
          gap: "4px",
        }}>
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setSection(item.id)}
              title={item.label}
              style={{
                flex: 1,
                height: "40px",
                border: "none",
                borderRadius: "10px",
                background: section === item.id ? "#2b3f50" : "transparent",
                color: section === item.id ? "#2ea6ff" : "#7c8d9e",
                fontSize: "18px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
                transition: "all 0.15s",
              }}
            >
              {item.icon}
              {item.id === "chats" && totalUnread > 0 && (
                <span style={{
                  position: "absolute",
                  top: "4px", right: "4px",
                  background: "#2ea6ff",
                  color: "#fff",
                  borderRadius: "10px",
                  fontSize: "10px",
                  fontWeight: 700,
                  padding: "1px 5px",
                  minWidth: "16px",
                  textAlign: "center",
                  lineHeight: "14px",
                }}>
                  {totalUnread > 99 ? "99+" : totalUnread}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Section content */}
        <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>

          {/* ── CHATS ── */}
          {section === "chats" && (
            <div style={{ flex: 1, overflowY: "auto" }}>
              <div style={{ padding: "12px 12px 6px" }}>
                <p style={{ color: "#4a5a6a", fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", margin: 0 }}>
                  Все чаты
                </p>
              </div>
              {loadingChats && chats.length === 0 ? (
                <div style={{ padding: "40px", textAlign: "center", color: "#4a5a6a" }}>Загрузка...</div>
              ) : chats.length === 0 ? (
                <div style={{ padding: "40px 20px", textAlign: "center" }}>
                  <div style={{ fontSize: "40px", marginBottom: "12px" }}>💬</div>
                  <p style={{ color: "#7c8d9e", fontSize: "14px" }}>Нет чатов</p>
                  <p style={{ color: "#4a5a6a", fontSize: "12px" }}>Найдите друзей в поиске</p>
                </div>
              ) : (
                chats.map(chat => (
                  <ChatRow
                    key={chat.id}
                    chat={chat}
                    active={activeChatId === chat.id}
                    onClick={() => openChat(chat.id)}
                  />
                ))
              )}
            </div>
          )}

          {/* ── SEARCH ── */}
          {section === "search" && (
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
              <div style={{ padding: "12px" }}>
                <input
                  type="text"
                  placeholder="Поиск по имени, @нику или номеру..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  autoFocus
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    background: "#1c2733",
                    border: "1px solid #1e2d3d",
                    borderRadius: "10px",
                    color: "#d1d5db",
                    fontSize: "14px",
                    outline: "none",
                    boxSizing: "border-box",
                    fontFamily: "'Golos Text', sans-serif",
                  }}
                />
              </div>
              {searchLoading && (
                <div style={{ padding: "20px", textAlign: "center", color: "#4a5a6a" }}>Поиск...</div>
              )}
              {!searchLoading && searchQuery.length >= 2 && searchResults.length === 0 && (
                <div style={{ padding: "40px 20px", textAlign: "center" }}>
                  <div style={{ fontSize: "32px", marginBottom: "10px" }}>🔍</div>
                  <p style={{ color: "#7c8d9e", fontSize: "14px" }}>Пользователи не найдены</p>
                </div>
              )}
              {searchResults.map(u => (
                <div
                  key={u.id}
                  onClick={() => startChatWithUser(u.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: "12px",
                    padding: "10px 16px", cursor: "pointer",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#1c2733")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <div style={{ position: "relative" }}>
                    <div style={{
                      width: "44px", height: "44px",
                      borderRadius: "50%",
                      background: u.avatar_color || "#2e6fdb",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "#fff", fontSize: "18px", fontWeight: 700,
                      flexShrink: 0,
                    }}>
                      {u.avatar_letter}
                    </div>
                    {u.online && (
                      <div style={{
                        position: "absolute", bottom: "1px", right: "1px",
                        width: "10px", height: "10px",
                        background: "#4cd964", borderRadius: "50%",
                        border: "2px solid #0e1621",
                      }} />
                    )}
                  </div>
                  <div>
                    <p style={{ color: "#d1d5db", fontSize: "15px", fontWeight: 600, margin: 0 }}>{u.name}</p>
                    <p style={{ color: "#4a5a6a", fontSize: "12px", margin: "2px 0 0" }}>
                      {u.username ? `@${u.username}` : u.phone}
                    </p>
                  </div>
                  <div style={{ marginLeft: "auto", color: "#2ea6ff", fontSize: "12px" }}>Написать →</div>
                </div>
              ))}
              {searchQuery.length < 2 && (
                <div style={{ padding: "40px 20px", textAlign: "center" }}>
                  <div style={{ fontSize: "36px", marginBottom: "12px" }}>👥</div>
                  <p style={{ color: "#7c8d9e", fontSize: "14px" }}>Введите имя, @никнейм или номер</p>
                  <p style={{ color: "#4a5a6a", fontSize: "12px" }}>Минимум 2 символа</p>
                </div>
              )}
            </div>
          )}

          {/* ── PROFILE ── */}
          {section === "profile" && (
            <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
              <div style={{ textAlign: "center", marginBottom: "24px" }}>
                <div style={{
                  width: "72px", height: "72px",
                  borderRadius: "50%",
                  background: currentUser.avatar_color || "#2e6fdb",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#fff", fontSize: "28px", fontWeight: 700,
                  margin: "0 auto 12px",
                }}>
                  {currentUser.avatar_letter}
                </div>
                <p style={{ color: "#fff", fontSize: "18px", fontWeight: 700, margin: 0 }}>{currentUser.name}</p>
                <p style={{ color: "#7c8d9e", fontSize: "13px", marginTop: "4px" }}>{currentUser.phone}</p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <ProfileField label="Имя" value={profileName} onChange={setProfileName} />
                <ProfileField label="@Никнейм" value={profileUsername} onChange={setProfileUsername} placeholder="username (только лат. буквы)" />
                <ProfileField label="О себе" value={profileBio} onChange={setProfileBio} placeholder="Расскажите о себе" multiline />

                {profileError && (
                  <div style={{ background: "#3d1a1a", borderRadius: "8px", padding: "10px 12px", color: "#ff6b6b", fontSize: "13px" }}>
                    {profileError}
                  </div>
                )}
                {profileSuccess && (
                  <div style={{ background: "#1a3d1a", borderRadius: "8px", padding: "10px 12px", color: "#4cd964", fontSize: "13px" }}>
                    ✓ Профиль сохранён
                  </div>
                )}

                <button
                  onClick={saveProfile}
                  disabled={profileSaving}
                  style={{
                    padding: "12px", background: profileSaving ? "#1a3a5c" : "#2ea6ff",
                    border: "none", borderRadius: "10px", color: "#fff",
                    fontSize: "14px", fontWeight: 600, cursor: profileSaving ? "not-allowed" : "pointer",
                  }}
                >
                  {profileSaving ? "Сохранение..." : "Сохранить"}
                </button>
              </div>
            </div>
          )}

          {/* ── SETTINGS ── */}
          {section === "settings" && (
            <div style={{ flex: 1, overflowY: "auto" }}>
              <div style={{ padding: "12px 12px 6px" }}>
                <p style={{ color: "#4a5a6a", fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", margin: 0 }}>
                  Настройки
                </p>
              </div>
              {[
                { icon: "🔔", label: "Уведомления", desc: "Звуки, вибрация, бейджи" },
                { icon: "🔒", label: "Конфиденциальность", desc: "Блокировка, сессии" },
                { icon: "🎨", label: "Оформление", desc: "Тёмная тема, шрифты" },
                { icon: "💾", label: "Данные и хранилище", desc: "Медиафайлы, кэш" },
                { icon: "🌐", label: "Язык", desc: "Русский" },
                { icon: "❓", label: "Помощь", desc: "FAQ и поддержка" },
              ].map(item => (
                <div key={item.label} style={{
                  display: "flex", alignItems: "center", gap: "14px",
                  padding: "13px 16px", cursor: "pointer", transition: "background 0.15s",
                }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#1c2733")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <span style={{ fontSize: "20px" }}>{item.icon}</span>
                  <div>
                    <p style={{ color: "#d1d5db", fontSize: "14px", fontWeight: 600, margin: 0 }}>{item.label}</p>
                    <p style={{ color: "#4a5a6a", fontSize: "12px", margin: "2px 0 0" }}>{item.desc}</p>
                  </div>
                </div>
              ))}
              <div style={{ padding: "12px 16px", borderTop: "1px solid #1e2d3d", marginTop: "8px" }}>
                <button
                  onClick={handleLogout}
                  style={{
                    width: "100%", padding: "12px",
                    background: "transparent", border: "1px solid #7c2020",
                    borderRadius: "10px", color: "#ff6b6b",
                    fontSize: "14px", fontWeight: 600, cursor: "pointer",
                  }}
                >
                  Выйти из аккаунта
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── MAIN CHAT AREA ───────────────────────────────────────────────────── */}
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        background: "#17212b",
        height: "100vh",
        overflow: "hidden",
        ...(mobileView === "list" ? { display: "none" } as React.CSSProperties : {}),
      }} className="chat-panel">

        {!activeChatId ? (
          <div style={{
            flex: 1, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: "12px",
          }}>
            <div style={{ fontSize: "64px" }}>💬</div>
            <p style={{ color: "#7c8d9e", fontSize: "18px", fontWeight: 600 }}>Выберите чат</p>
            <p style={{ color: "#4a5a6a", fontSize: "14px" }}>Или найдите друга через поиск</p>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div style={{
              display: "flex", alignItems: "center", gap: "12px",
              padding: "0 16px", height: "56px",
              borderBottom: "1px solid #1e2d3d",
              background: "#0e1621",
              flexShrink: 0,
            }}>
              <button
                onClick={() => setMobileView("list")}
                style={{
                  display: "none",
                  background: "none", border: "none", color: "#7c8d9e",
                  fontSize: "20px", cursor: "pointer", padding: "4px",
                }}
                className="back-btn"
              >
                ←
              </button>
              <div style={{ position: "relative" }}>
                <div style={{
                  width: "38px", height: "38px", borderRadius: "50%",
                  background: activeChat?.avatar_color || "#2e6fdb",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#fff", fontSize: "16px", fontWeight: 700,
                }}>
                  {activeChat?.avatar_letter}
                </div>
                {activeChat?.other_user?.online && (
                  <div style={{
                    position: "absolute", bottom: "1px", right: "1px",
                    width: "9px", height: "9px",
                    background: "#4cd964", borderRadius: "50%",
                    border: "2px solid #0e1621",
                  }} />
                )}
              </div>
              <div>
                <p style={{ color: "#fff", fontSize: "15px", fontWeight: 600, margin: 0 }}>{activeChat?.name}</p>
                <p style={{ color: "#4cd964", fontSize: "12px", margin: "1px 0 0" }}>
                  {activeChat?.other_user?.online ? "в сети" : activeChat?.type === "private" ? "не в сети" : `${activeChat?.members_count} участников`}
                </p>
              </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 12px", display: "flex", flexDirection: "column", gap: "4px" }}>
              {loadingMsgs && (
                <div style={{ textAlign: "center", color: "#4a5a6a", padding: "20px" }}>Загрузка сообщений...</div>
              )}
              {!loadingMsgs && messages.length === 0 && (
                <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                  <div style={{ fontSize: "40px" }}>👋</div>
                  <p style={{ color: "#7c8d9e", fontSize: "14px" }}>Начните диалог!</p>
                  <p style={{ color: "#4a5a6a", fontSize: "12px" }}>Напишите первое сообщение</p>
                </div>
              )}
              {messages.map((msg, i) => {
                const isOut = msg.sender_id === currentUser.id;
                const prevMsg = i > 0 ? messages[i - 1] : null;
                const showSender = !isOut && activeChat?.type !== "private" && (!prevMsg || prevMsg.sender_id !== msg.sender_id);
                return (
                  <MessageBubble
                    key={msg.id}
                    msg={msg}
                    isOut={isOut}
                    showSender={showSender}
                    isPrivate={activeChat?.type === "private"}
                  />
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div style={{
              padding: "10px 12px",
              borderTop: "1px solid #1e2d3d",
              background: "#0e1621",
              display: "flex", alignItems: "flex-end", gap: "8px",
              flexShrink: 0,
            }}>
              <textarea
                ref={inputRef}
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Написать сообщение..."
                rows={1}
                style={{
                  flex: 1,
                  padding: "10px 14px",
                  background: "#1c2733",
                  border: "1px solid #1e2d3d",
                  borderRadius: "20px",
                  color: "#d1d5db",
                  fontSize: "14px",
                  outline: "none",
                  resize: "none",
                  fontFamily: "'Golos Text', sans-serif",
                  lineHeight: "1.4",
                  maxHeight: "120px",
                  overflowY: "auto",
                }}
                onInput={e => {
                  const el = e.currentTarget;
                  el.style.height = "auto";
                  el.style.height = Math.min(el.scrollHeight, 120) + "px";
                }}
              />
              <button
                onClick={sendMessage}
                disabled={!inputText.trim() || sending}
                style={{
                  width: "42px", height: "42px",
                  background: inputText.trim() ? "#2ea6ff" : "#1e2d3d",
                  border: "none", borderRadius: "50%",
                  color: "#fff", fontSize: "18px",
                  cursor: inputText.trim() ? "pointer" : "default",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                  transition: "background 0.2s",
                }}
              >
                ➤
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Chat Row ─────────────────────────────────────────────────────────────────
function ChatRow({ chat, active, onClick }: {
  chat: ChatItem;
  active: boolean;
  onClick: () => void;
}) {
  const unread = Number(chat.unread_count);
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: "12px",
        padding: "10px 12px",
        background: active ? "#1c2d3d" : "transparent",
        borderLeft: active ? "3px solid #2ea6ff" : "3px solid transparent",
        cursor: "pointer",
        transition: "background 0.15s",
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = "#131f2b"; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
    >
      {/* Avatar */}
      <div style={{ position: "relative", flexShrink: 0 }}>
        <div style={{
          width: "46px", height: "46px", borderRadius: "50%",
          background: chat.avatar_color || "#2e6fdb",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff", fontSize: "18px", fontWeight: 700,
        }}>
          {chat.avatar_letter}
        </div>
        {chat.other_user?.online && (
          <div style={{
            position: "absolute", bottom: "1px", right: "1px",
            width: "10px", height: "10px",
            background: "#4cd964", borderRadius: "50%",
            border: "2px solid #0e1621",
          }} />
        )}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <p style={{
            color: "#d1d5db", fontSize: "15px", fontWeight: 600,
            margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            maxWidth: "160px",
          }}>
            {chat.name}
          </p>
          {chat.last_message_time && (
            <span style={{ color: "#4a5a6a", fontSize: "11px", flexShrink: 0 }}>
              {formatTime(chat.last_message_time)}
            </span>
          )}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "2px" }}>
          <p style={{
            color: "#7c8d9e", fontSize: "13px", margin: 0,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            maxWidth: "180px",
          }}>
            {chat.last_message || "Нет сообщений"}
          </p>
          {unread > 0 && (
            <span style={{
              background: "#2ea6ff", color: "#fff",
              borderRadius: "10px", fontSize: "11px", fontWeight: 700,
              padding: "2px 6px", minWidth: "18px", textAlign: "center",
              flexShrink: 0,
            }}>
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Message Bubble ───────────────────────────────────────────────────────────
function MessageBubble({ msg, isOut, showSender, isPrivate }: {
  msg: Message;
  isOut: boolean;
  showSender: boolean;
  isPrivate: boolean;
}) {
  return (
    <div style={{
      display: "flex",
      justifyContent: isOut ? "flex-end" : "flex-start",
      marginBottom: "2px",
    }}>
      {!isOut && !isPrivate && (
        <div style={{
          width: "30px", height: "30px", borderRadius: "50%",
          background: msg.sender_color || "#2e6fdb",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff", fontSize: "12px", fontWeight: 700,
          flexShrink: 0, marginRight: "8px", alignSelf: "flex-end",
          opacity: showSender ? 1 : 0,
        }}>
          {msg.sender_avatar}
        </div>
      )}
      <div style={{ maxWidth: "65%" }}>
        {showSender && (
          <p style={{
            color: msg.sender_color || "#2ea6ff",
            fontSize: "12px", fontWeight: 600,
            margin: "0 0 3px 4px",
          }}>
            {msg.sender_name}
          </p>
        )}
        <div style={{
          background: isOut ? "#2b5278" : "#1c2733",
          borderRadius: isOut ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
          padding: "8px 12px",
          display: "inline-block",
        }}>
          <p style={{
            color: "#d1d5db", fontSize: "14px", margin: 0,
            whiteSpace: "pre-wrap", wordBreak: "break-word", lineHeight: "1.4",
          }}>
            {msg.text}
          </p>
          <p style={{
            color: "#4a5a6a", fontSize: "11px", margin: "4px 0 0",
            textAlign: "right", lineHeight: 1,
          }}>
            {formatFull(msg.created_at)}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Profile Field ────────────────────────────────────────────────────────────
function ProfileField({ label, value, onChange, placeholder, multiline }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
}) {
  const style: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    background: "#0e1621",
    border: "1px solid #1e2d3d",
    borderRadius: "10px",
    color: "#d1d5db",
    fontSize: "14px",
    outline: "none",
    boxSizing: "border-box",
    fontFamily: "'Golos Text', sans-serif",
    resize: multiline ? "vertical" : "none",
  };

  return (
    <div>
      <label style={{ display: "block", color: "#7c8d9e", fontSize: "12px", marginBottom: "5px", fontWeight: 500 }}>
        {label}
      </label>
      {multiline ? (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          style={style}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          style={style}
        />
      )}
    </div>
  );
}