import { type Message } from '@/store';

type MessageItemProps = {
    message: Message;
  }
export default function MessageItem({ message}: MessageItemProps) {
  return (
    <div 
      className={`${
        message.role === 'user' 
          ? "bg-white border border-slate-300" 
          : "bg-slate-50 border border-slate-200"
      } rounded-md drop-shadow-md p-4 my-4`}
    >
      {message.content}
    </div>
  );
}