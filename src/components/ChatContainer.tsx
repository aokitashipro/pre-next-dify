'use client';
import { useEffect, useRef, useState } from 'react';
import { useChatStore, Message } from '@/store/chatStore';
import ChatInput from '@/components/ChatInput';
import ResourceViewer from '@/components/ResourceViewer';

interface ChatContainerProps {
  userId: string;
  initialMessages?: Message[];
  conversationId?: string;
}

export default function ChatContainer({ userId, initialMessages = [], conversationId }: ChatContainerProps) {
  const resourcesVisible = true;
  const [initialized, setInitialized] = useState(false);
  
  const { 
    currentMessages, 
    setConversationId,
    clearMessages,
    addMessage,
    setResources,
  } = useChatStore();
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // 現在の会話IDからリソース情報を取得
  // useMemoでキャッシュ化
  // 不要な再計算の防止、 currentConversationId, getResourcesが更新されない限り計算の再実行されない
  // 同じオブジェクト参照が維持される。ResourcesViewへの不要な際レンダリングを防止
  // 以前はおそらくリソース情報の参照が変わるたびに子コンポーネントが再マウントされていた可能性

  // const currentResources = useMemo(() => {
  //   return currentConversationId ? getResources(currentConversationId) : null;
  // }, [currentConversationId, getResources]);
  
  // 初期化ロジック
  useEffect(() => {
    if (initialized) return;
    
    if (conversationId) {
      setConversationId(conversationId);
      clearMessages();
      
      if (initialMessages.length > 0) {
        // すべてのメッセージを追加
        initialMessages.forEach(message => addMessage(message));
        
        // 初期メッセージからリソース情報を抽出して保存
        // const latestResources = findLatestResources(initialMessages);
        // if (latestResources?.length) {
        //   console.log(`ChatContainer: ${latestResources.length}件のリソースを初期化します`);
        //   setResources(conversationId, latestResources);
        // }
      }
    } else {
      clearMessages();
    }
    
    setInitialized(true);
  }, [conversationId, initialMessages, setConversationId, clearMessages, addMessage, initialized, setResources]);

  // メッセージが追加されたら自動スクロール
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentMessages]);

  // メッセージが更新されたら、最新のリソースを探して保存
    // メッセージが追加されたら自動スクロール
    useEffect(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [currentMessages]);
  

    return (
      <div className="flex flex-col h-full">
        {/* メッセージ表示エリア */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-4">
            {currentMessages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-gray-500">
                  <h3 className="text-lg font-medium">会話を始めましょう</h3>
                  <p className="text-sm">メッセージを入力してAIとチャットを開始できます</p>
                </div>
              </div>
            ) : (
              <>
                {/* メッセージリスト */}
                {currentMessages.map((message, index) => (
                  <div key={index} className="mb-4">
                    <div className="flex flex-col">
                      <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[75%] p-3 rounded-lg ${
                          message.role === 'user'
                            ? 'bg-white border border-slate-200'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          <p className="whitespace-pre-wrap">{message.content}</p>
                        </div>
                      </div>
                      
                      {/* そのメッセージにリソースがある場合にのみ、直下にリソースビューアーを表示 */}
                      {message.role === 'assistant' && 
                        Array.isArray(message.resources) && 
                         message.resources?.length > 0 && 
                         resourcesVisible && (
                          <div className="mt-2 ml-2">
                            <ResourceViewer resources={message.resources || [] } />
                          </div>
                        )}
                    </div>
                  </div>
                ))}
              </>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </div>
        
        {/* 入力エリア */}
        <div className="flex-shrink-0 border-t bg-white">
          <ChatInput userId={userId} conversationId={conversationId} />
        </div>
      </div>
    );
}