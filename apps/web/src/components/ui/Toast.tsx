import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";

export type ToastTone = "success" | "error" | "info";

interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}

export interface ToastApi {
  notify: (message: string, tone?: ToastTone) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const TONE_DURATION_MS: Record<ToastTone, number> = {
  success: 4000,
  info: 4000,
  error: 6000,
};

/** 同屏最多保留的 toast 数；超过则丢弃最旧的。 */
const MAX_TOASTS = 5;

const TONE_ICON = {
  success: CheckCircle2,
  error: AlertTriangle,
  info: Info,
} as const;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((toast) => toast.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const notify = useCallback(
    (message: string, tone: ToastTone = "info") => {
      const id = (nextId.current += 1);
      setToasts((list) => {
        const next = [...list, { id, message, tone }];
        // 超过上限丢弃最旧的；被丢弃 toast 的计时器到点后 dismiss 自然清理。
        return next.length > MAX_TOASTS ? next.slice(next.length - MAX_TOASTS) : next;
      });
      const timer = setTimeout(() => dismiss(id), TONE_DURATION_MS[tone]);
      timers.current.set(id, timer);
    },
    [dismiss],
  );

  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach(clearTimeout);
      pending.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={{ notify }}>
      {children}
      <div className="ui-toast-viewport">
        {toasts.map((toast) => {
          const Icon = TONE_ICON[toast.tone];
          return (
            <div
              key={toast.id}
              className={`ui-toast ui-toast-${toast.tone}`}
              role={toast.tone === "error" ? "alert" : "status"}
            >
              <Icon size={16} aria-hidden className="ui-toast-icon" />
              <span className="ui-toast-message">{toast.message}</span>
              <button
                type="button"
                className="ui-toast-close"
                aria-label="关闭通知"
                onClick={() => dismiss(toast.id)}
              >
                <X size={14} aria-hidden />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

const NOOP_TOAST: ToastApi = { notify: () => {} };

/**
 * 反馈 toast 句柄。Provider 在 App 根部挂载（由 e2e 保证）。
 * 组件在测试中常被孤立渲染、不套 Provider——此时降级为 no-op，
 * 避免给每个孤立测试强制套壳；需要断言 toast 的测试自行套 ToastProvider。
 */
export function useToast(): ToastApi {
  return useContext(ToastContext) ?? NOOP_TOAST;
}
