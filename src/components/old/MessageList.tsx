'use client';
import { useChatStore } from '@/store/chatStore';
import MessageItem from './MessageItem';

export default function MessageList() {
  const { currentMessages, isLoading } = useChatStore();
  
  return (
    <div className="text-base mx-4 flex-grow overflow-y-auto py-4">
      {currentMessages.map((message, index) => (
        <MessageItem key={index} message={message} />
      ))}
      
      {isLoading && (
        <div className="bg-slate-50 border border-slate-200 rounded-md drop-shadow-md p-4 my-4">
          <div className="animate-pulse">AI が応答を考えています...</div>
        </div>
      )}
    </div>
  );
}