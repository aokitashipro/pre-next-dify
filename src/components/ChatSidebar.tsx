'use client';
import { useEffect } from 'react';
import { PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useChatStore, Conversation } from '@/store/chatStore';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';

interface ChatSidebarProps {
  initialConversations: Conversation[];
  currentConversationId?: string; // 現在選択中の会話ID (オプショナル)
}

export default function ChatSidebar({ initialConversations, currentConversationId }: ChatSidebarProps) {
  const router = useRouter();
  const { 
    conversations, 
    setConversations,
    setConversationId,
    clearMessages
  } = useChatStore();

  // 初回レンダリング時に会話履歴をセット
  useEffect(() => {
    if (initialConversations.length > 0) {
      setConversations(initialConversations);
    }
    
    // 現在の会話IDがある場合はストアにセット
    if (currentConversationId) {
      setConversationId(currentConversationId);
    }
  }, [initialConversations, currentConversationId, setConversations, setConversationId]);

  // 新規チャットの作成
  const handleNewChat = () => {
    clearMessages();
    setConversationId('');
    // ルートページにリダイレクト
    router.push('/chat');
  };

  // 既存の会話を選択
  const selectConversation = (conversation: Conversation) => {
    // conversationIdが存在し、かつ空でないことを確認
    if (!conversation.conversationId) {
      console.error('無効な会話ID:', conversation);
      return; // 無効な会話IDの場合は処理を中止
    }
    
    setConversationId(conversation.conversationId);
    
    // 遷移先のパスをログ出力して確認
    const targetPath = `/chat/${conversation.conversationId}`;
    console.log('遷移先:', targetPath);
    
    router.push(targetPath);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="my-2">
        <Button 
          variant="outline" 
          className="w-full justify-start gap-2" 
          onClick={handleNewChat}
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
            conversations.map((conversation, index) => (
              <button
   key={`conversation-${index}-${conversation.conversationId}`}
  className={`w-full text-left px-3 py-2 rounded-md hover:bg-slate-200 transition-colors flex flex-col ${
                  currentConversationId === conversation.conversationId ? 'bg-slate-200' : ''
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