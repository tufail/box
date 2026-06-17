import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { CheckCircle, XCircle, AlertTriangle, Info, X } from "lucide-react";

export type NotificationType = "success" | "error" | "warning" | "info";

interface NotificationItem {
  id: number;
  type: NotificationType;
  message: string;
  duration: number;
  exiting: boolean;
}

interface NotificationContextValue {
  notify: (message: string, type?: NotificationType, duration?: number) => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

let nextId = 0;

const CONFIG: Record<NotificationType, { icon: React.ReactNode; bar: string }> = {
  success: { icon: <CheckCircle size={17} className="text-green-500 shrink-0" />, bar: "bg-green-500" },
  error:   { icon: <XCircle    size={17} className="text-red-500 shrink-0"   />, bar: "bg-red-500"   },
  warning: { icon: <AlertTriangle size={17} className="text-yellow-500 shrink-0" />, bar: "bg-yellow-500" },
  info:    { icon: <Info       size={17} className="text-blue-500 shrink-0"  />, bar: "bg-blue-500"  },
};

function Toast({
  item,
  onDismiss,
}: {
  item: NotificationItem;
  onDismiss: (id: number) => void;
}) {
  const [entered, setEntered] = useState(false);
  const { icon, bar } = CONFIG[item.type];

  // Trigger enter animation after mount
  useEffect(() => {
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const visible = entered && !item.exiting;

  return (
    <div
      className={`relative flex items-start gap-3 bg-white shadow-lg rounded-lg overflow-hidden pr-4 pl-4 py-3 min-w-[300px] max-w-sm pointer-events-auto transition-all duration-300 ease-out ${
        visible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-10"
      }`}
    >
      {/* Left colour bar */}
      <span className={`absolute left-0 top-0 bottom-0 w-1 ${bar}`} />

      {icon}

      <p className="text-sm text-gray-800 flex-1 leading-snug">{item.message}</p>

      <button
        onClick={() => onDismiss(item.id)}
        aria-label="Dismiss"
        className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer shrink-0 mt-0.5"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const dismiss = useCallback((id: number) => {
    // Mark as exiting to play the exit animation
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, exiting: true } : n))
    );
    // Remove from DOM after animation finishes
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 320);
  }, []);

  const notify = useCallback(
    (message: string, type: NotificationType = "info", duration = 4000) => {
      const id = ++nextId;
      setNotifications((prev) => [
        ...prev,
        { id, type, message, duration, exiting: false },
      ]);
      setTimeout(() => dismiss(id), duration);
    },
    [dismiss]
  );

  return (
    <NotificationContext.Provider value={{ notify }}>
      {children}
      <div
        aria-live="polite"
        aria-label="Notifications"
        className="fixed top-4 right-4 z-[200] flex flex-col gap-2 pointer-events-none"
      >
        {notifications.map((item) => (
          <Toast key={item.id} item={item} onDismiss={dismiss} />
        ))}
      </div>
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotification must be used within NotificationProvider");
  return ctx;
}
