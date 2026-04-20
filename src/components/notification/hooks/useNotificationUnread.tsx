import {
  createContext,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  useContext,
  useState,
} from 'react';

interface NotificationUnreadContextValue {
  unreadCount: number;
  setUnreadCount: Dispatch<SetStateAction<number>>;
}

const NotificationUnreadContext =
  createContext<NotificationUnreadContextValue | null>(null);

export function NotificationUnreadProvider(props: { children: ReactNode }) {
  const { children } = props;
  const [unreadCount, setUnreadCount] = useState(0);

  return (
    <NotificationUnreadContext.Provider value={{ unreadCount, setUnreadCount }}>
      {children}
    </NotificationUnreadContext.Provider>
  );
}

export function useNotificationUnread() {
  const context = useContext(NotificationUnreadContext);

  if (!context) {
    throw new Error(
      'useNotificationUnread must be used within NotificationUnreadProvider'
    );
  }

  return context;
}
