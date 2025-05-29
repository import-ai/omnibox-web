import { Outlet } from 'react-router-dom';

export default function ChatPage() {
  return (
    <div className="flex justify-center h-full p-4">
      <div className="flex flex-col h-full max-w-3xl w-full">
        <Outlet />
      </div>
    </div>
  );
}
