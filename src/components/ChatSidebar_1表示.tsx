// ハイブリッドアプローチのサイドバーの例
"use client";
import { useEffect } from 'react';
import { useChatStore } from '@/store';
import type { Conversation } from '@/store';
import { PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';

// サーバーから取得した初期会話データを受け取るプロップス
type ChatSidebarProps = {
  initialConversations: Conversation[];
};

export default function ChatSidebar({ initialConversations }: ChatSidebarProps) {
  const { 
    conversations, 
    setConversations, 
    currentConversationId 
  } = useChatStore();

  // 初期データをストアに設定
  useEffect(() => {
    if (initialConversations.length > 0) {
      setConversations(initialConversations);
    }
  }, [initialConversations, setConversations]);

  return (
    <div className="h-full flex flex-col">
      <div className="mb-4">
        <Button 
          variant="outline" 
          className="w-full" 
          
        >
          <PlusCircle size={18} />
          新規チャット
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-1">
          {conversations.length === 0 ? (
            <p className="text-sm text-muted-foreground px-2 py-2">
              会話履歴がありません
            </p>
          ) : (
            conversations.map((conversation) => (
              <button
                key={conversation.id}
                className={`w-full text-left px-3 py-2 rounded-md hover:bg-slate-200 transition-colors flex flex-col ${
                  currentConversationId === conversation.id ? 'bg-slate-200' : ''
                }`}
                onClick={() => selectConversation(conversation)}
              >
                <span className="font-medium truncate">{conversation.title || '無題の会話'}</span>
                <span className="text-xs text-gray-500">
                  {formatDistanceToNow(new Date(conversation.updatedAt), { 
                    addSuffix: true,
                    locale: ja 
                  })}
                </span>
              </button>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}