import { useState, useRef, useEffect } from "react";
import Icon from "@/components/ui/icon";

type Section = "chats" | "groups" | "channels" | "search" | "profile" | "settings";

interface Chat {
  id: number;
  name: string;
  avatar: string;
  lastMessage: string;
  time: string;
  unread: number;
  online: boolean;
  pinned?: boolean;
  type: "chat" | "group" | "channel";
  members?: number;
  subscribers?: number;
  muted?: boolean;
}

interface Message {
  id: number;
  text: string;
  time: string;
  out: boolean;
  read?: boolean;
  reactions?: string[];
}

const AVATAR_COLORS = [
  "#2e6fdb", "#7c3aed", "#059669", "#d97706",
  "#db2777", "#0891b2", "#dc2626", "#65a30d",
];
function getColor(id: number) { return AVATAR_COLORS[id % AVATAR_COLORS.length]; }
function nowTime() { return new Date().toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" }); }

const INIT_CHATS: Chat[] = [
  { id: 1, name: "Алина Смирнова", avatar: "А", lastMessage: "Увидимся завтра в 10 🌙", time: "22:41", unread: 3, online: true, pinned: true, type: "chat" },
  { id: 2, name: "Команда проекта", avatar: "К", lastMessage: "Дима: отчёт готов", time: "21:05", unread: 12, online: false, type: "group", members: 8 },
  { id: 3, name: "Макс Петров", avatar: "М", lastMessage: "Ты видел новость?", time: "20:33", unread: 0, online: true, type: "chat" },
  { id: 4, name: "Мама", avatar: "М", lastMessage: "Позвони когда освободишься", time: "19:10", unread: 1, online: false, type: "chat" },
  { id: 5, name: "Артём Кузнецов", avatar: "А", lastMessage: "👍", time: "18:44", unread: 0, online: false, type: "chat" },
  { id: 6, name: "Оля Новикова", avatar: "О", lastMessage: "Спасибо за помощь!", time: "17:22", unread: 0, online: true, type: "chat" },
  { id: 7, name: "Сергей Волков", avatar: "С", lastMessage: "Жду твоего ответа", time: "14:03", unread: 2, online: false, type: "chat" },
];

const INIT_GROUPS: Chat[] = [
  { id: 10, name: "Дизайн-команда", avatar: "Д", lastMessage: "Новый макет загружен", time: "23:01", unread: 5, online: false, type: "group", members: 12 },
  { id: 11, name: "Семья ❤️", avatar: "С", lastMessage: "Папа: всем привет!", time: "20:15", unread: 8, online: false, type: "group", members: 6 },
  { id: 12, name: "Котики 🐱", avatar: "К", lastMessage: "Смотрите какой пушистый", time: "18:44", unread: 0, online: false, type: "group", members: 34 },
];

const INIT_CHANNELS: Chat[] = [
  { id: 20, name: "Tech новости", avatar: "T", lastMessage: "OpenAI выпустила GPT-5", time: "22:00", unread: 15, online: false, type: "channel", subscribers: 41200 },
  { id: 21, name: "Крипто сигналы", avatar: "₿", lastMessage: "BTC пробил 100k", time: "21:30", unread: 3, online: false, type: "channel", subscribers: 8900 },
  { id: 22, name: "Дизайн daily", avatar: "D", lastMessage: "10 трендов 2026 года", time: "09:00", unread: 0, online: false, type: "channel", subscribers: 3100 },
];

const INIT_MESSAGES: Record<number, Message[]> = {
  1: [
    { id: 1, text: "Привет! Как дела?", time: "22:30", out: false, read: true },
    { id: 2, text: "Всё отлично, готовимся к встрече 😊", time: "22:32", out: true, read: true },
    { id: 3, text: "Отлично! Тогда до завтра!", time: "22:40", out: false, read: true },
    { id: 4, text: "Увидимся завтра в 10 🌙", time: "22:41", out: false, read: false },
  ],
  2: [
    { id: 1, text: "Всем привет! Встреча сегодня в 18:00", time: "09:00", out: false, read: true },
    { id: 2, text: "Буду!", time: "09:15", out: true, read: true },
    { id: 3, text: "Дима: отчёт готов, скидываю файл", time: "21:05", out: false, read: false },
  ],
  3: [
    { id: 1, text: "Привет, как дела?", time: "19:00", out: true, read: true },
    { id: 2, text: "Хорошо! Ты видел новость про Tesla?", time: "20:33", out: false, read: false },
  ],
  10: [
    { id: 1, text: "Ребята, смотрите новый макет", time: "22:55", out: false, read: true },
    { id: 2, text: "Новый макет загружен в Figma", time: "23:01", out: false, read: false },
  ],
  20: [
    { id: 1, text: "🔥 OpenAI выпустила GPT-5 с поддержкой видео в реальном времени", time: "22:00", out: false, read: false },
  ],
};

const PROFILE = {
  name: "Алексей Иванов",
  username: "@aleksey_mycat",
  phone: "+7 900 123-45-67",
  bio: "Пишите в любое время 🌙",
  avatar: "А",
};

const SETTINGS_ITEMS = [
  { icon: "Bell", label: "Уведомления", desc: "Звуки, вибрация, бейджи", destructive: false },
  { icon: "Shield", label: "Конфиденциальность", desc: "Блокировка, сессии", destructive: false },
  { icon: "Palette", label: "Оформление", desc: "Тёмная тема, шрифты", destructive: false },
  { icon: "Database", label: "Данные и хранилище", desc: "Медиафайлы, кэш", destructive: false },
  { icon: "Languages", label: "Язык", desc: "Русский", destructive: false },
  { icon: "HelpCircle", label: "Помощь", desc: "FAQ и поддержка", destructive: false },
  { icon: "LogOut", label: "Выйти", desc: "", destructive: true },
];

const NAV = [
  { key: "chats",    icon: "MessageCircle", label: "Чаты" },
  { key: "groups",   icon: "Users",         label: "Группы" },
  { key: "channels", icon: "Radio",         label: "Каналы" },
  { key: "search",   icon: "Search",        label: "Поиск" },
  { key: "profile",  icon: "User",          label: "Профиль" },
  { key: "settings", icon: "Settings",      label: "Настройки" },
] as const;

export default function Index() {
  const [section, setSection] = useState<Section>("chats");
  const [chats, setChats] = useState(INIT_CHATS);
  const [groups, setGroups] = useState(INIT_GROUPS);
  const [channels, setChannels] = useState(INIT_CHANNELS);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [message, setMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [globalSearch, setGlobalSearch] = useState("");
  const [messages, setMessages] = useState(INIT_MESSAGES);
  const [notification, setNotification] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; msgId: number; chatId: number } | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profile, setProfile] = useState(PROFILE);
  const [profileDraft, setProfileDraft] = useState(PROFILE);
  const [settingToggles, setSettingToggles] = useState({ notifications: true, sounds: true, darkMode: true, readReceipts: true });
  const [activeSettingPanel, setActiveSettingPanel] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingMsg, setEditingMsg] = useState<Message | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeChat]);

  useEffect(() => {
    if (activeChat) inputRef.current?.focus();
  }, [activeChat]);

  const toast = (text: string) => {
    setNotification(text);
    setTimeout(() => setNotification(null), 2800);
  };

  const openChat = (chat: Chat) => {
    setActiveChat(chat);
    setReplyTo(null);
    setEditingMsg(null);
    // Mark as read
    const updater = (list: Chat[]) => list.map(c => c.id === chat.id ? { ...c, unread: 0 } : c);
    if (chat.type === "chat") setChats(updater);
    else if (chat.type === "group") setGroups(updater);
    else setChannels(updater);
  };

  const sendMessage = () => {
    if (!message.trim() || !activeChat) return;
    const text = message.trim();
    setMessage("");

    if (editingMsg) {
      setMessages(prev => ({
        ...prev,
        [activeChat.id]: (prev[activeChat.id] || []).map(m =>
          m.id === editingMsg.id ? { ...m, text } : m
        ),
      }));
      setEditingMsg(null);
      return;
    }

    const newMsg: Message = { id: Date.now(), text, time: nowTime(), out: true, read: false };
    setMessages(prev => ({
      ...prev,
      [activeChat.id]: [...(prev[activeChat.id] || []), newMsg],
    }));

    // Update last message in list
    const updateLast = (list: Chat[]) => list.map(c =>
      c.id === activeChat.id ? { ...c, lastMessage: text, time: nowTime() } : c
    );
    if (activeChat.type === "chat") setChats(updateLast);
    else if (activeChat.type === "group") setGroups(updateLast);
    else setChannels(updateLast);

    setReplyTo(null);

    // Auto-reply simulation
    if (activeChat.type === "chat") {
      setTimeout(() => {
        const replies = [
          "Понял, спасибо!", "Окей 👍", "Хорошо, договорились!",
          "Напишу позже", "Ок, буду знать 😊", "Спасибо за сообщение!",
        ];
        const reply: Message = {
          id: Date.now() + 1,
          text: replies[Math.floor(Math.random() * replies.length)],
          time: nowTime(), out: false, read: false,
        };
        setMessages(prev => ({
          ...prev,
          [activeChat.id]: [...(prev[activeChat.id] || []), reply],
        }));
        if (settingToggles.notifications) toast(`Новое сообщение от ${activeChat.name}`);
      }, 1200 + Math.random() * 800);
    }
  };

  const deleteMessage = (chatId: number, msgId: number) => {
    setMessages(prev => ({
      ...prev,
      [chatId]: (prev[chatId] || []).filter(m => m.id !== msgId),
    }));
    setContextMenu(null);
  };

  const startEdit = (msg: Message) => {
    if (!msg.out) return;
    setEditingMsg(msg);
    setMessage(msg.text);
    setContextMenu(null);
    inputRef.current?.focus();
  };

  const addReaction = (chatId: number, msgId: number, emoji: string) => {
    setMessages(prev => ({
      ...prev,
      [chatId]: (prev[chatId] || []).map(m =>
        m.id === msgId
          ? { ...m, reactions: [...(m.reactions || []).filter(r => r !== emoji), ...(m.reactions?.includes(emoji) ? [] : [emoji])] }
          : m
      ),
    }));
    setContextMenu(null);
  };

  const getList = () => {
    if (section === "chats") return chats;
    if (section === "groups") return groups;
    if (section === "channels") return channels;
    return [];
  };

  const filteredList = getList().filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Global search across all
  const allChats = [...chats, ...groups, ...channels];
  const globalResults = globalSearch.length > 1
    ? allChats.filter(c => c.name.toLowerCase().includes(globalSearch.toLowerCase()))
    : [];

  const unreadMap: Record<string, number> = {
    chats: chats.reduce((s, c) => s + c.unread, 0),
    groups: groups.reduce((s, c) => s + c.unread, 0),
    channels: channels.reduce((s, c) => s + c.unread, 0),
    search: 0, profile: 0, settings: 0,
  };

  const sectionLabel: Record<Section, string> = {
    chats: "Чаты", groups: "Группы", channels: "Каналы",
    search: "Поиск", profile: "Профиль", settings: "Настройки",
  };

  return (
    <div
      className="flex h-screen w-screen overflow-hidden font-golos select-none"
      style={{ background: "var(--tg-bg)" }}
      onClick={() => setContextMenu(null)}
    >
      {/* Toast notification */}
      {notification && (
        <div
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-fade-in px-4 py-2.5 rounded-2xl text-sm font-medium shadow-2xl flex items-center gap-2"
          style={{ background: "var(--tg-panel)", color: "var(--tg-text)", border: "1px solid var(--tg-border)", backdropFilter: "blur(12px)" }}
        >
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: "var(--tg-online)" }} />
          {notification}
        </div>
      )}

      {/* Context menu */}
      {contextMenu && (
        <div
          className="fixed z-50 rounded-2xl overflow-hidden shadow-2xl animate-scale-in"
          style={{ top: contextMenu.y, left: contextMenu.x, background: "var(--tg-panel)", border: "1px solid var(--tg-border)", minWidth: 180 }}
          onClick={e => e.stopPropagation()}
        >
          <div className="flex gap-2 p-3 border-b" style={{ borderColor: "var(--tg-border)" }}>
            {["❤️","👍","😂","😮","😢","🔥"].map(emoji => (
              <button key={emoji} onClick={() => addReaction(contextMenu.chatId, contextMenu.msgId, emoji)}
                className="text-xl hover:scale-125 transition-transform">{emoji}</button>
            ))}
          </div>
          {messages[contextMenu.chatId]?.find(m => m.id === contextMenu.msgId)?.out && (
            <button
              onClick={() => { const m = messages[contextMenu.chatId]?.find(x => x.id === contextMenu.msgId); if (m) startEdit(m); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left hover:bg-white/5"
              style={{ color: "var(--tg-text)" }}
            >
              <Icon name="Pencil" size={14} /> Редактировать
            </button>
          )}
          <button
            onClick={() => { const m = messages[contextMenu.chatId]?.find(x => x.id === contextMenu.msgId); if (m) { setReplyTo(m); setContextMenu(null); } }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left hover:bg-white/5"
            style={{ color: "var(--tg-text)" }}
          >
            <Icon name="Reply" size={14} /> Ответить
          </button>
          <button
            onClick={() => deleteMessage(contextMenu.chatId, contextMenu.msgId)}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left hover:bg-white/5"
            style={{ color: "#ff3b30" }}
          >
            <Icon name="Trash2" size={14} /> Удалить
          </button>
        </div>
      )}

      {/* LEFT NAV */}
      <aside
        className="flex flex-col items-center py-4 gap-1 z-20 shrink-0"
        style={{ width: 68, background: "var(--tg-sidebar)", borderRight: "1px solid var(--tg-border)" }}
      >
        <div className="mb-3">
          <div className="w-10 h-10 rounded-2xl overflow-hidden">
            <img src="https://cdn.poehali.dev/files/eff26452-fbe5-4617-a298-ccc4856936c4.png" alt="MyCat" className="w-full h-full object-cover" />
          </div>
        </div>

        {NAV.map(item => {
          const badge = unreadMap[item.key];
          const active = section === item.key;
          return (
            <button
              key={item.key}
              onClick={() => { setSection(item.key); setActiveChat(null); setSearchQuery(""); }}
              className="relative flex items-center justify-center w-12 h-12 rounded-2xl transition-all duration-200"
              style={{ background: active ? "var(--tg-accent)" : "transparent", color: active ? "#fff" : "var(--tg-text-secondary)" }}
              title={item.label}
            >
              <Icon name={item.icon} size={20} />
              {badge > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1 pulse-badge"
                  style={{ background: "var(--tg-unread)", color: "#fff", fontSize: 10, fontWeight: 700 }}>
                  {badge > 99 ? "99+" : badge}
                </span>
              )}
            </button>
          );
        })}

        <div className="flex-1" />
        <button
          onClick={() => { setSection("profile"); setActiveChat(null); }}
          className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all hover:scale-105"
          style={{ background: getColor(0), color: "#fff" }}
          title="Мой профиль"
        >
          {profile.avatar}
        </button>
      </aside>

      {/* CHAT LIST */}
      <div className="flex flex-col shrink-0 h-full" style={{ width: 300, background: "var(--tg-sidebar)", borderRight: "1px solid var(--tg-border)" }}>
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid var(--tg-border)" }}>
          <h2 className="font-semibold text-base" style={{ color: "var(--tg-text)" }}>{sectionLabel[section]}</h2>
          {(section === "chats" || section === "groups") && (
            <button className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/5 transition-colors" style={{ color: "var(--tg-accent)" }}
              onClick={() => toast("Создание нового " + (section === "chats" ? "диалога" : "группы") + " — скоро будет доступно!")}>
              <Icon name="PenSquare" size={17} />
            </button>
          )}
        </div>

        {/* Search */}
        {section !== "profile" && section !== "settings" && (
          <div className="px-3 py-2">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: "var(--tg-panel)" }}>
              <Icon name="Search" size={14} style={{ color: "var(--tg-text-secondary)" }} />
              <input
                type="text"
                placeholder="Поиск..."
                value={section === "search" ? globalSearch : searchQuery}
                onChange={e => section === "search" ? setGlobalSearch(e.target.value) : setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent text-sm outline-none"
                style={{ color: "var(--tg-text)" }}
              />
              {(searchQuery || globalSearch) && (
                <button onClick={() => { setSearchQuery(""); setGlobalSearch(""); }} style={{ color: "var(--tg-text-secondary)" }}>
                  <Icon name="X" size={13} />
                </button>
              )}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {/* Chat / Group / Channel list */}
          {(section === "chats" || section === "groups" || section === "channels") && (
            filteredList.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 gap-2" style={{ color: "var(--tg-text-secondary)" }}>
                <Icon name="SearchX" size={32} />
                <span className="text-sm">Ничего не найдено</span>
              </div>
            ) : (
              filteredList.map(chat => (
                <button
                  key={chat.id}
                  onClick={() => openChat(chat)}
                  className="w-full flex items-center gap-3 px-3 py-3 transition-all duration-100 text-left"
                  style={{ background: activeChat?.id === chat.id ? "var(--tg-active)" : "transparent" }}
                  onMouseEnter={e => { if (activeChat?.id !== chat.id) (e.currentTarget as HTMLElement).style.background = "var(--tg-hover)"; }}
                  onMouseLeave={e => { if (activeChat?.id !== chat.id) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                >
                  <div className="relative shrink-0">
                    <div className="w-11 h-11 rounded-full flex items-center justify-center text-base font-semibold text-white"
                      style={{ background: getColor(chat.id) }}>
                      {chat.avatar}
                    </div>
                    {chat.online && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2"
                        style={{ background: "var(--tg-online)", borderColor: "var(--tg-sidebar)" }} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-medium text-sm truncate flex items-center gap-1" style={{ color: "var(--tg-text)" }}>
                        {chat.pinned && <Icon name="Pin" size={11} className="opacity-50 shrink-0" />}
                        {chat.muted && <Icon name="BellOff" size={11} className="opacity-50 shrink-0" />}
                        {chat.name}
                      </span>
                      <span className="text-xs shrink-0 ml-2" style={{ color: "var(--tg-text-secondary)" }}>{chat.time}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs truncate" style={{ color: "var(--tg-text-secondary)" }}>{chat.lastMessage}</span>
                      {chat.unread > 0 && (
                        <span className="text-xs font-bold min-w-[20px] h-5 rounded-full flex items-center justify-center px-1 ml-2 shrink-0"
                          style={{ background: chat.muted ? "var(--tg-text-secondary)" : "var(--tg-unread)", color: "#fff", fontSize: 10 }}>
                          {chat.unread}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )
          )}

          {/* Global Search */}
          {section === "search" && (
            globalResults.length > 0 ? (
              <div>
                <p className="px-4 py-2 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--tg-text-secondary)" }}>Результаты</p>
                {globalResults.map(chat => (
                  <button key={chat.id} onClick={() => { openChat(chat); setSection(chat.type === "chat" ? "chats" : chat.type === "group" ? "groups" : "channels"); }}
                    className="w-full flex items-center gap-3 px-3 py-3 hover:bg-white/5 text-left transition-colors">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold text-white shrink-0"
                      style={{ background: getColor(chat.id) }}>{chat.avatar}</div>
                    <div>
                      <p className="text-sm font-medium" style={{ color: "var(--tg-text)" }}>{chat.name}</p>
                      <p className="text-xs" style={{ color: "var(--tg-text-secondary)" }}>
                        {chat.type === "chat" ? "Личный чат" : chat.type === "group" ? `Группа · ${chat.members} участников` : `Канал · ${chat.subscribers?.toLocaleString()} подписчиков`}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            ) : globalSearch.length > 1 ? (
              <div className="flex flex-col items-center justify-center h-40 gap-2" style={{ color: "var(--tg-text-secondary)" }}>
                <Icon name="SearchX" size={32} />
                <span className="text-sm">Ничего не найдено</span>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-3 px-6 text-center" style={{ color: "var(--tg-text-secondary)" }}>
                <Icon name="Search" size={40} />
                <p className="text-sm leading-relaxed">Введите имя контакта, группы или канала</p>
              </div>
            )
          )}

          {/* Profile */}
          {section === "profile" && (
            <div className="flex flex-col items-center pt-6 px-4 gap-4 animate-fade-in">
              <div className="relative">
                <div className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-white"
                  style={{ background: getColor(0) }}>{profile.avatar}</div>
                <span className="absolute bottom-1 right-1 w-3.5 h-3.5 rounded-full border-2"
                  style={{ background: "var(--tg-online)", borderColor: "var(--tg-sidebar)" }} />
              </div>
              {editingProfile ? (
                <div className="w-full flex flex-col gap-3">
                  {(["name", "username", "phone", "bio"] as const).map(field => (
                    <div key={field}>
                      <p className="text-xs mb-1" style={{ color: "var(--tg-text-secondary)" }}>
                        {{ name: "Имя", username: "Username", phone: "Телефон", bio: "О себе" }[field]}
                      </p>
                      <input
                        value={profileDraft[field]}
                        onChange={e => setProfileDraft(p => ({ ...p, [field]: e.target.value }))}
                        className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                        style={{ background: "var(--tg-panel)", color: "var(--tg-text)", border: "1px solid var(--tg-border)" }}
                      />
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <button onClick={() => { setProfile(profileDraft); setEditingProfile(false); toast("Профиль сохранён"); }}
                      className="flex-1 py-2 rounded-xl text-sm font-semibold" style={{ background: "var(--tg-accent)", color: "#fff" }}>
                      Сохранить
                    </button>
                    <button onClick={() => { setProfileDraft(profile); setEditingProfile(false); }}
                      className="flex-1 py-2 rounded-xl text-sm font-semibold" style={{ background: "var(--tg-panel)", color: "var(--tg-text)" }}>
                      Отмена
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="text-center">
                    <h3 className="font-semibold text-base" style={{ color: "var(--tg-text)" }}>{profile.name}</h3>
                    <p className="text-sm mt-0.5" style={{ color: "var(--tg-accent)" }}>{profile.username}</p>
                    <p className="text-xs mt-1" style={{ color: "var(--tg-online)" }}>в сети</p>
                  </div>
                  <div className="w-full rounded-xl overflow-hidden" style={{ background: "var(--tg-panel)" }}>
                    {[
                      { icon: "Phone", label: "Телефон", value: profile.phone },
                      { icon: "Info", label: "О себе", value: profile.bio },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-3 px-4 py-3"
                        style={{ borderBottom: i === 0 ? "1px solid var(--tg-border)" : "none" }}>
                        <Icon name={item.icon} size={16} style={{ color: "var(--tg-accent)" }} />
                        <div>
                          <p className="text-xs" style={{ color: "var(--tg-text-secondary)" }}>{item.label}</p>
                          <p className="text-sm" style={{ color: "var(--tg-text)" }}>{item.value}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => { setProfileDraft(profile); setEditingProfile(true); }}
                    className="w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
                    style={{ background: "var(--tg-accent)", color: "#fff" }}>
                    <Icon name="Pencil" size={14} /> Редактировать профиль
                  </button>
                </>
              )}
            </div>
          )}

          {/* Settings */}
          {section === "settings" && (
            <div className="flex flex-col pt-3 px-3 gap-1.5 animate-fade-in">
              {/* Toggles */}
              <div className="rounded-xl overflow-hidden mb-2" style={{ background: "var(--tg-panel)" }}>
                {([
                  { key: "notifications", label: "Уведомления", icon: "Bell" },
                  { key: "sounds", label: "Звуки", icon: "Volume2" },
                  { key: "readReceipts", label: "Отметки прочтения", icon: "CheckCheck" },
                ] as const).map((item, i, arr) => (
                  <div key={item.key} className="flex items-center justify-between px-4 py-3"
                    style={{ borderBottom: i < arr.length - 1 ? "1px solid var(--tg-border)" : "none" }}>
                    <div className="flex items-center gap-3">
                      <Icon name={item.icon} size={16} style={{ color: "var(--tg-accent)" }} />
                      <span className="text-sm" style={{ color: "var(--tg-text)" }}>{item.label}</span>
                    </div>
                    <button
                      onClick={() => setSettingToggles(p => ({ ...p, [item.key]: !p[item.key] }))}
                      className="w-11 h-6 rounded-full transition-all duration-200 relative"
                      style={{ background: settingToggles[item.key] ? "var(--tg-accent)" : "var(--tg-border)" }}>
                      <span className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-200"
                        style={{ left: settingToggles[item.key] ? "calc(100% - 22px)" : "2px" }} />
                    </button>
                  </div>
                ))}
              </div>

              {SETTINGS_ITEMS.map((item, i) => (
                <button key={i}
                  onClick={() => {
                    if (item.label === "Выйти") { toast("Функция выхода будет доступна после авторизации"); return; }
                    setActiveSettingPanel(activeSettingPanel === item.label ? null : item.label);
                  }}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-left transition-colors"
                  style={{ background: activeSettingPanel === item.label ? "var(--tg-active)" : "var(--tg-panel)" }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: item.destructive ? "#ff3b3020" : "var(--tg-accent)20", color: item.destructive ? "#ff3b30" : "var(--tg-accent)" }}>
                    <Icon name={item.icon} size={15} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium" style={{ color: item.destructive ? "#ff3b30" : "var(--tg-text)" }}>{item.label}</p>
                    {item.desc && <p className="text-xs" style={{ color: "var(--tg-text-secondary)" }}>{item.desc}</p>}
                  </div>
                  {!item.destructive && <Icon name="ChevronRight" size={14} style={{ color: "var(--tg-text-secondary)" }} />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* MAIN AREA */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {activeChat ? (
          <>
            {/* Chat header */}
            <div className="flex items-center gap-3 px-5 py-3 shrink-0"
              style={{ background: "var(--tg-panel)", borderBottom: "1px solid var(--tg-border)" }}>
              <div className="relative cursor-pointer" onClick={() => toast(`Профиль ${activeChat.name}`)}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold text-white"
                  style={{ background: getColor(activeChat.id) }}>{activeChat.avatar}</div>
                {activeChat.online && (
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2"
                    style={{ background: "var(--tg-online)", borderColor: "var(--tg-panel)" }} />
                )}
              </div>
              <div className="flex-1 cursor-pointer" onClick={() => toast(`Информация о ${activeChat.name}`)}>
                <p className="font-semibold text-sm" style={{ color: "var(--tg-text)" }}>{activeChat.name}</p>
                <p className="text-xs" style={{ color: activeChat.online ? "var(--tg-online)" : "var(--tg-text-secondary)" }}>
                  {activeChat.type === "channel"
                    ? `${activeChat.subscribers?.toLocaleString()} подписчиков`
                    : activeChat.type === "group"
                    ? `${activeChat.members} участников`
                    : activeChat.online ? "в сети" : "был(а) недавно"}
                </p>
              </div>
              <div className="flex items-center gap-1" style={{ color: "var(--tg-text-secondary)" }}>
                {activeChat.type === "chat" && (
                  <>
                    <button onClick={() => toast("Голосовой звонок...")}
                      className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-white/5 transition-colors">
                      <Icon name="Phone" size={17} />
                    </button>
                    <button onClick={() => toast("Видеозвонок...")}
                      className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-white/5 transition-colors">
                      <Icon name="Video" size={17} />
                    </button>
                  </>
                )}
                <button
                  onClick={() => {
                    const updater = (list: Chat[]) => list.map(c => c.id === activeChat.id ? { ...c, muted: !c.muted } : c);
                    if (activeChat.type === "chat") setChats(updater);
                    else if (activeChat.type === "group") setGroups(updater);
                    else setChannels(updater);
                    setActiveChat(p => p ? { ...p, muted: !p.muted } : p);
                    toast(activeChat.muted ? "Уведомления включены" : "Уведомления отключены");
                  }}
                  className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-white/5 transition-colors">
                  <Icon name={activeChat.muted ? "BellOff" : "Bell"} size={17} />
                </button>
                <button onClick={() => toast("Поиск по сообщениям")}
                  className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-white/5 transition-colors">
                  <Icon name="Search" size={17} />
                </button>
                <button onClick={() => toast("Дополнительные параметры")}
                  className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-white/5 transition-colors">
                  <Icon name="MoreVertical" size={17} />
                </button>
              </div>
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-1" style={{ background: "var(--tg-bg)" }}>
              {(messages[activeChat.id] || []).length === 0 && (
                <div className="flex-1 flex flex-col items-center justify-center gap-2 h-full" style={{ color: "var(--tg-text-secondary)" }}>
                  <Icon name="MessageCircle" size={40} />
                  <p className="text-sm">Начните переписку!</p>
                </div>
              )}
              {(messages[activeChat.id] || []).map((msg, i) => (
                <div key={msg.id}
                  className={`flex ${msg.out ? "justify-end" : "justify-start"} animate-fade-in group`}
                  style={{ animationDelay: `${Math.min(i * 20, 200)}ms` }}>
                  <div
                    className="max-w-[65%] px-4 py-2 text-sm relative cursor-pointer"
                    style={{
                      background: msg.out ? "var(--tg-message-out)" : "var(--tg-message-in)",
                      color: "var(--tg-text)",
                      borderRadius: msg.out ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                    }}
                    onContextMenu={e => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, msgId: msg.id, chatId: activeChat.id }); }}
                  >
                    {msg.reactions && msg.reactions.length > 0 && (
                      <div className="flex gap-1 mb-1">
                        {msg.reactions.map(r => (
                          <span key={r} className="text-base">{r}</span>
                        ))}
                      </div>
                    )}
                    <p className="leading-relaxed whitespace-pre-wrap break-words">{msg.text}</p>
                    <p className="text-right mt-1 flex items-center justify-end gap-1"
                      style={{ color: "var(--tg-text-secondary)", fontSize: 10 }}>
                      {msg.time}
                      {msg.out && <Icon name={msg.read ? "CheckCheck" : "Check"} size={12} style={{ color: msg.read ? "var(--tg-accent)" : "var(--tg-text-secondary)" }} />}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Reply/Edit bar */}
            {(replyTo || editingMsg) && (
              <div className="flex items-center gap-3 px-4 py-2 shrink-0"
                style={{ background: "var(--tg-panel)", borderTop: "1px solid var(--tg-border)" }}>
                <div className="w-0.5 h-8 rounded-full" style={{ background: "var(--tg-accent)" }} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium" style={{ color: "var(--tg-accent)" }}>
                    {editingMsg ? "Редактировать" : `Ответить ${activeChat.name}`}
                  </p>
                  <p className="text-xs truncate" style={{ color: "var(--tg-text-secondary)" }}>
                    {(editingMsg || replyTo)?.text}
                  </p>
                </div>
                <button onClick={() => { setReplyTo(null); setEditingMsg(null); setMessage(""); }}
                  style={{ color: "var(--tg-text-secondary)" }}>
                  <Icon name="X" size={16} />
                </button>
              </div>
            )}

            {/* Input */}
            {activeChat.type !== "channel" && (
              <div className="flex items-center gap-3 px-4 py-3 shrink-0"
                style={{ background: "var(--tg-panel)", borderTop: "1px solid var(--tg-border)" }}>
                <button onClick={() => toast("Прикрепить файл — скоро!")} style={{ color: "var(--tg-text-secondary)" }}>
                  <Icon name="Paperclip" size={20} />
                </button>
                <div className="flex-1 flex items-center rounded-2xl px-4 py-2" style={{ background: "var(--tg-bg)" }}>
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder={editingMsg ? "Редактировать сообщение..." : "Сообщение..."}
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } if (e.key === "Escape") { setReplyTo(null); setEditingMsg(null); setMessage(""); } }}
                    className="flex-1 bg-transparent text-sm outline-none"
                    style={{ color: "var(--tg-text)" }}
                  />
                  <button onClick={() => toast("Эмодзи — скоро!")} style={{ color: "var(--tg-text-secondary)" }}>
                    <Icon name="Smile" size={18} />
                  </button>
                </div>
                <button
                  onClick={sendMessage}
                  className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all duration-200 hover:scale-105"
                  style={{ background: message.trim() ? "var(--tg-accent)" : "var(--tg-panel)", color: message.trim() ? "#fff" : "var(--tg-text-secondary)" }}>
                  <Icon name={editingMsg ? "Check" : "Send"} size={18} />
                </button>
              </div>
            )}

            {/* Channel footer */}
            {activeChat.type === "channel" && (
              <div className="flex items-center justify-center px-4 py-3 shrink-0 gap-2"
                style={{ background: "var(--tg-panel)", borderTop: "1px solid var(--tg-border)", color: "var(--tg-text-secondary)" }}>
                <Icon name="Radio" size={14} />
                <span className="text-sm">Канал — только чтение</span>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-4" style={{ color: "var(--tg-text-secondary)" }}>
            <div className="w-20 h-20 rounded-3xl overflow-hidden shadow-xl">
              <img src="https://cdn.poehali.dev/files/eff26452-fbe5-4617-a298-ccc4856936c4.png" alt="MyCat" className="w-full h-full object-cover" />
            </div>
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-1" style={{ color: "var(--tg-text)" }}>MyCat</h2>
              <p className="text-sm">Выберите чат, чтобы начать общение</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
