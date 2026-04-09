import { useState } from "react";
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
}

interface Message {
  id: number;
  text: string;
  time: string;
  out: boolean;
}

const CHATS: Chat[] = [
  { id: 1, name: "Алина Смирнова", avatar: "А", lastMessage: "Увидимся завтра в 10 🌙", time: "22:41", unread: 3, online: true, pinned: true },
  { id: 2, name: "Команда проекта", avatar: "К", lastMessage: "Дима: отчёт готов", time: "21:05", unread: 12, online: false },
  { id: 3, name: "Макс Петров", avatar: "М", lastMessage: "Ты видел новость?", time: "20:33", unread: 0, online: true },
  { id: 4, name: "Мама", avatar: "М", lastMessage: "Позвони когда освободишься", time: "19:10", unread: 1, online: false },
  { id: 5, name: "Артём Кузнецов", avatar: "А", lastMessage: "👍", time: "18:44", unread: 0, online: false },
  { id: 6, name: "Оля Новикова", avatar: "О", lastMessage: "Спасибо за помощь!", time: "17:22", unread: 0, online: true },
  { id: 7, name: "Сергей Волков", avatar: "С", lastMessage: "Жду твоего ответа", time: "14:03", unread: 2, online: false },
];

const GROUPS: Chat[] = [
  { id: 10, name: "Дизайн-команда", avatar: "Д", lastMessage: "Новый макет загружен", time: "23:01", unread: 5, online: false },
  { id: 11, name: "Семья ❤️", avatar: "С", lastMessage: "Папа: всем привет!", time: "20:15", unread: 8, online: false },
  { id: 12, name: "Котики 🐱", avatar: "К", lastMessage: "Смотрите какой пушистый", time: "18:44", unread: 0, online: false },
];

const CHANNELS: Chat[] = [
  { id: 20, name: "Tech новости", avatar: "T", lastMessage: "OpenAI выпустила GPT-5", time: "22:00", unread: 15, online: false },
  { id: 21, name: "Крипто сигналы", avatar: "₿", lastMessage: "BTC пробил 100k", time: "21:30", unread: 3, online: false },
  { id: 22, name: "Дизайн daily", avatar: "D", lastMessage: "10 трендов 2026 года", time: "09:00", unread: 0, online: false },
];

const MESSAGES: Record<number, Message[]> = {
  1: [
    { id: 1, text: "Привет! Как дела?", time: "22:30", out: false },
    { id: 2, text: "Всё отлично, готовимся к встрече", time: "22:32", out: true },
    { id: 3, text: "Отлично! Тогда до завтра 😊", time: "22:40", out: false },
    { id: 4, text: "Увидимся завтра в 10 🌙", time: "22:41", out: false },
  ],
  10: [
    { id: 1, text: "Ребята, посмотрите новый макет", time: "22:55", out: false },
    { id: 2, text: "Новый макет загружен", time: "23:01", out: false },
  ],
};

const AVATAR_COLORS = [
  "bg-blue-600", "bg-purple-600", "bg-green-600",
  "bg-orange-500", "bg-pink-600", "bg-teal-600", "bg-red-600",
];

function getColor(id: number) {
  return AVATAR_COLORS[id % AVATAR_COLORS.length];
}

const NAV = [
  { key: "chats",    icon: "MessageCircle", label: "Чаты" },
  { key: "groups",   icon: "Users",         label: "Группы" },
  { key: "channels", icon: "Radio",         label: "Каналы" },
  { key: "search",   icon: "Search",        label: "Поиск" },
  { key: "profile",  icon: "User",          label: "Профиль" },
  { key: "settings", icon: "Settings",      label: "Настройки" },
] as const;

function getTotalUnread(list: Chat[]) {
  return list.reduce((s, c) => s + c.unread, 0);
}

export default function Index() {
  const [section, setSection] = useState<Section>("chats");
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [message, setMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [notification, setNotification] = useState<string | null>(null);
  const [messages, setMessages] = useState(MESSAGES);

  const showNotification = (text: string) => {
    setNotification(text);
    setTimeout(() => setNotification(null), 3000);
  };

  const sendMessage = () => {
    if (!message.trim() || !activeChat) return;
    const newMsg: Message = {
      id: Date.now(),
      text: message.trim(),
      time: new Date().toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" }),
      out: true,
    };
    setMessages(prev => ({
      ...prev,
      [activeChat.id]: [...(prev[activeChat.id] || []), newMsg],
    }));
    setMessage("");
    setTimeout(() => {
      showNotification(`Сообщение отправлено в «${activeChat.name}»`);
    }, 300);
  };

  const getList = () => {
    if (section === "chats") return CHATS;
    if (section === "groups") return GROUPS;
    if (section === "channels") return CHANNELS;
    return [];
  };

  const filteredList = getList().filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sectionLabel: Record<Section, string> = {
    chats: "Чаты", groups: "Группы", channels: "Каналы",
    search: "Поиск", profile: "Профиль", settings: "Настройки",
  };

  const chatUnread = getTotalUnread(CHATS);
  const groupUnread = getTotalUnread(GROUPS);
  const channelUnread = getTotalUnread(CHANNELS);

  const unreadMap: Record<string, number> = {
    chats: chatUnread, groups: groupUnread, channels: channelUnread,
    search: 0, profile: 0, settings: 0,
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden font-golos" style={{ background: "var(--tg-bg)" }}>

      {/* Notification toast */}
      {notification && (
        <div
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-fade-in px-4 py-2 rounded-xl text-sm font-medium shadow-2xl"
          style={{ background: "var(--tg-accent)", color: "#fff", backdropFilter: "blur(8px)" }}
        >
          <div className="flex items-center gap-2">
            <Icon name="Bell" size={14} />
            {notification}
          </div>
        </div>
      )}

      {/* LEFT SIDEBAR — Navigation */}
      <aside
        className="flex flex-col items-center py-4 gap-1 z-20 shrink-0"
        style={{ width: 68, background: "var(--tg-sidebar)", borderRight: "1px solid var(--tg-border)" }}
      >
        {/* Logo */}
        <div className="mb-3 flex flex-col items-center">
          <div className="w-10 h-10 rounded-2xl overflow-hidden">
            <img
              src="https://cdn.poehali.dev/files/eff26452-fbe5-4617-a298-ccc4856936c4.png"
              alt="MyCat"
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {NAV.map(item => {
          const badge = unreadMap[item.key];
          const active = section === item.key;
          return (
            <button
              key={item.key}
              onClick={() => { setSection(item.key); setActiveChat(null); }}
              className="relative flex flex-col items-center justify-center w-12 h-12 rounded-2xl transition-all duration-200 group"
              style={{
                background: active ? "var(--tg-accent)" : "transparent",
                color: active ? "#fff" : "var(--tg-text-secondary)",
              }}
              title={item.label}
            >
              <Icon name={item.icon} size={20} />
              {badge > 0 && (
                <span
                  className="absolute -top-1 -right-1 text-xs font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1 pulse-badge"
                  style={{ background: "var(--tg-unread)", color: "#fff", fontSize: 10 }}
                >
                  {badge > 99 ? "99+" : badge}
                </span>
              )}
            </button>
          );
        })}

        {/* Bottom spacer + avatar */}
        <div className="flex-1" />
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold cursor-pointer"
          style={{ background: "var(--tg-panel)", color: "var(--tg-accent)", border: "2px solid var(--tg-accent)" }}
        >
          Я
        </div>
      </aside>

      {/* CHAT LIST PANEL */}
      <div
        className="flex flex-col shrink-0 h-full"
        style={{ width: 300, background: "var(--tg-sidebar)", borderRight: "1px solid var(--tg-border)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid var(--tg-border)" }}>
          <h2 className="font-semibold text-base" style={{ color: "var(--tg-text)" }}>
            {sectionLabel[section]}
          </h2>
          {section !== "profile" && section !== "settings" && section !== "search" && (
            <button
              className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
              style={{ color: "var(--tg-accent)" }}
            >
              <Icon name="PenSquare" size={17} />
            </button>
          )}
        </div>

        {/* Search bar */}
        {(section === "chats" || section === "groups" || section === "channels" || section === "search") && (
          <div className="px-3 py-2">
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ background: "var(--tg-panel)" }}
            >
              <Icon name="Search" size={14} style={{ color: "var(--tg-text-secondary)" }} />
              <input
                type="text"
                placeholder="Поиск..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent text-sm outline-none"
                style={{ color: "var(--tg-text)" }}
              />
            </div>
          </div>
        )}

        {/* List */}
        <div className="flex-1 overflow-y-auto">
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
                  onClick={() => setActiveChat(chat)}
                  className="w-full flex items-center gap-3 px-3 py-3 transition-all duration-150 text-left"
                  style={{
                    background: activeChat?.id === chat.id ? "var(--tg-active)" : "transparent",
                  }}
                  onMouseEnter={e => {
                    if (activeChat?.id !== chat.id) {
                      (e.currentTarget as HTMLElement).style.background = "var(--tg-hover)";
                    }
                  }}
                  onMouseLeave={e => {
                    if (activeChat?.id !== chat.id) {
                      (e.currentTarget as HTMLElement).style.background = "transparent";
                    }
                  }}
                >
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <div
                      className={`w-11 h-11 rounded-full flex items-center justify-center text-base font-semibold text-white ${getColor(chat.id)}`}
                    >
                      {chat.avatar}
                    </div>
                    {chat.online && (
                      <span
                        className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2"
                        style={{ background: "var(--tg-online)", borderColor: "var(--tg-sidebar)" }}
                      />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-medium text-sm truncate" style={{ color: "var(--tg-text)" }}>
                        {chat.pinned && <Icon name="Pin" size={11} className="inline mr-1 opacity-60" />}
                        {chat.name}
                      </span>
                      <span className="text-xs shrink-0 ml-2" style={{ color: "var(--tg-text-secondary)" }}>
                        {chat.time}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs truncate" style={{ color: "var(--tg-text-secondary)" }}>
                        {chat.lastMessage}
                      </span>
                      {chat.unread > 0 && (
                        <span
                          className="text-xs font-bold min-w-[20px] h-5 rounded-full flex items-center justify-center px-1 ml-2 shrink-0"
                          style={{ background: "var(--tg-unread)", color: "#fff", fontSize: 10 }}
                        >
                          {chat.unread}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )
          )}

          {section === "search" && (
            <div className="flex flex-col items-center justify-center h-full gap-3 px-6 text-center" style={{ color: "var(--tg-text-secondary)" }}>
              <Icon name="Search" size={40} />
              <p className="text-sm leading-relaxed">Ищи людей, группы и каналы по имени или @username</p>
            </div>
          )}

          {section === "profile" && (
            <div className="flex flex-col items-center pt-8 px-4 gap-4 animate-fade-in">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-white bg-blue-600"
              >
                Я
              </div>
              <div className="text-center">
                <h3 className="font-semibold text-base" style={{ color: "var(--tg-text)" }}>Мой профиль</h3>
                <p className="text-sm mt-1" style={{ color: "var(--tg-text-secondary)" }}>@mycat_user</p>
              </div>
              <div className="w-full rounded-xl overflow-hidden" style={{ background: "var(--tg-panel)" }}>
                {[
                  { icon: "Phone", label: "Телефон", value: "+7 900 000-00-00" },
                  { icon: "Info", label: "О себе", value: "Пишите в любое время 🌙" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: i === 0 ? "1px solid var(--tg-border)" : "none" }}>
                    <Icon name={item.icon} size={16} style={{ color: "var(--tg-accent)" }} />
                    <div>
                      <p className="text-xs" style={{ color: "var(--tg-text-secondary)" }}>{item.label}</p>
                      <p className="text-sm" style={{ color: "var(--tg-text)" }}>{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {section === "settings" && (
            <div className="flex flex-col pt-4 px-3 gap-2 animate-fade-in">
              {[
                { icon: "Bell", label: "Уведомления", desc: "Звуки, вибрация, бейджи", destructive: false },
                { icon: "Shield", label: "Конфиденциальность", desc: "Блокировка, сессии", destructive: false },
                { icon: "Palette", label: "Оформление", desc: "Темы, шрифты, цвета", destructive: false },
                { icon: "Database", label: "Данные и хранилище", desc: "Медиафайлы, кэш", destructive: false },
                { icon: "HelpCircle", label: "Помощь", desc: "FAQ и поддержка", destructive: false },
                { icon: "LogOut", label: "Выйти", desc: "", destructive: true },
              ].map((item, i) => (
                <button
                  key={i}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-left transition-colors"
                  style={{ background: "var(--tg-panel)" }}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: item.destructive ? "#ff3b3020" : "var(--tg-accent)20", color: item.destructive ? "#ff3b30" : "var(--tg-accent)" }}
                  >
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

      {/* MAIN AREA — Chat or Welcome */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {activeChat ? (
          <>
            {/* Chat header */}
            <div
              className="flex items-center gap-3 px-5 py-3 shrink-0"
              style={{ background: "var(--tg-panel)", borderBottom: "1px solid var(--tg-border)" }}
            >
              <div className="relative">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold text-white ${getColor(activeChat.id)}`}>
                  {activeChat.avatar}
                </div>
                {activeChat.online && (
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2" style={{ background: "var(--tg-online)", borderColor: "var(--tg-panel)" }} />
                )}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm" style={{ color: "var(--tg-text)" }}>{activeChat.name}</p>
                <p className="text-xs" style={{ color: activeChat.online ? "var(--tg-online)" : "var(--tg-text-secondary)" }}>
                  {activeChat.online ? "в сети" : "был(а) недавно"}
                </p>
              </div>
              <div className="flex items-center gap-2" style={{ color: "var(--tg-text-secondary)" }}>
                <button className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/5 transition-colors">
                  <Icon name="Phone" size={17} />
                </button>
                <button className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/5 transition-colors">
                  <Icon name="Video" size={17} />
                </button>
                <button className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/5 transition-colors">
                  <Icon name="MoreVertical" size={17} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div
              className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-2"
              style={{ background: "var(--tg-bg)" }}
            >
              {(messages[activeChat.id] || []).map((msg, i) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.out ? "justify-end" : "justify-start"} animate-fade-in`}
                  style={{ animationDelay: `${i * 30}ms` }}
                >
                  <div
                    className="max-w-[65%] px-4 py-2 rounded-2xl text-sm"
                    style={{
                      background: msg.out ? "var(--tg-message-out)" : "var(--tg-message-in)",
                      color: "var(--tg-text)",
                      borderRadius: msg.out ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                    }}
                  >
                    <p className="leading-relaxed">{msg.text}</p>
                    <p className="text-right mt-1" style={{ color: "var(--tg-text-secondary)", fontSize: 10 }}>
                      {msg.time}
                      {msg.out && <Icon name="CheckCheck" size={12} className="inline ml-1" style={{ color: "var(--tg-accent)" }} />}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Input */}
            <div
              className="flex items-center gap-3 px-4 py-3 shrink-0"
              style={{ background: "var(--tg-panel)", borderTop: "1px solid var(--tg-border)" }}
            >
              <button className="shrink-0" style={{ color: "var(--tg-text-secondary)" }}>
                <Icon name="Paperclip" size={20} />
              </button>
              <div className="flex-1 flex items-center rounded-2xl px-4 py-2" style={{ background: "var(--tg-bg)" }}>
                <input
                  type="text"
                  placeholder="Сообщение..."
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && sendMessage()}
                  className="flex-1 bg-transparent text-sm outline-none"
                  style={{ color: "var(--tg-text)" }}
                />
                <button style={{ color: "var(--tg-text-secondary)" }}>
                  <Icon name="Smile" size={18} />
                </button>
              </div>
              <button
                onClick={sendMessage}
                className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all duration-200"
                style={{
                  background: message.trim() ? "var(--tg-accent)" : "var(--tg-panel)",
                  color: message.trim() ? "#fff" : "var(--tg-text-secondary)",
                }}
              >
                <Icon name="Send" size={18} />
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-4" style={{ color: "var(--tg-text-secondary)" }}>
            <div className="w-20 h-20 rounded-3xl overflow-hidden">
              <img
                src="https://cdn.poehali.dev/files/eff26452-fbe5-4617-a298-ccc4856936c4.png"
                alt="MyCat"
                className="w-full h-full object-cover"
              />
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