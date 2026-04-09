import { useState, useEffect } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Index from "./pages/Index";
import Auth, { type User } from "./pages/Auth";
import { api, getToken, removeToken } from "./lib/api";

const queryClient = new QueryClient();

function AppContent() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    api.me()
      .then(data => setUser(data.user))
      .catch(() => removeToken())
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "#17212b",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Golos Text', sans-serif",
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>💬</div>
          <p style={{ color: "#7c8d9e", fontSize: "16px" }}>Загрузка...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Auth onAuth={(u) => setUser(u)} />;
  }

  return <Index user={user} onLogout={() => setUser(null)} />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AppContent />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
