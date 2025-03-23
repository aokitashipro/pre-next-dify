'use client';
import { useEffect, useRef, useState, useCallback, useMemo, memo } from 'react';
import { useChatStore, Message } from '@/store/chatStore';
import ChatInput from '@/components/ChatInput';
import ResourceViewer from '@/components/ResourceViewer';
import AttachmentViewer from '@/components/AttachmentViewer';

interface ChatContainerProps {
  userId: string;
  initialMessages?: Message[];
  conversationId?: string;
}

// メッセージ内の添付ファイルをログに出力するためのカスタムフック
const useLogAttachments = (messages: Message[]) => {
  useEffect(() => {
    console.log("======== メッセージ状態のログ出力 ========");
    console.log(`メッセージ数: ${messages.length}`);
    
    messages.forEach((msg, idx) => {
      const role = msg.role === 'user' ? 'ユーザー' : 'アシスタント';
      console.log(`[${idx}] ${role}: ${msg.content.substring(0, 20)}...`);
      
      if (msg.attachments && msg.attachments.length > 0) {
        console.log(`  添付ファイル(${msg.attachments.length}件):`, 
          msg.attachments.map(a => `${a.fileName} (URL=${a.fileUrl?.substring(0, 15) || 'なし'}, ID=${a.fileId || 'なし'})`));
      }
    });
    console.log("======== ログ出力終了 ========");
  }, [messages]);
};

// Messageコンポーネントを抽出してメモ化
const MessageItem = memo(function MessageItemBase({ 
  message, 
  index, 
  resourcesVisible 
}: { 
  message: Message; 
  index: number; 
  resourcesVisible: boolean;
}) {
  // メッセージの一意のキーを生成
  const messageKey = message.id || `msg-${index}-${message.role}-${Date.now()}`;
  
  // 添付ファイルの状態を確認
  const hasAttachments = message.attachments && message.attachments.length > 0;
  
  console.log(`MessageItem: ${message.role}メッセージ(${index}) レンダリング, ID=${messageKey}`, 
    hasAttachments ? `添付ファイル ${message.attachments?.length}件` : '添付ファイルなし');
  
  if (hasAttachments && message.attachments) {
    console.log(`  ${messageKey} の添付ファイル:`, message.attachments.map(a => 
      `${a.fileName} (URL=${a.fileUrl?.substring(0, 20) || 'なし'}, ID=${a.fileId || 'なし'})`));
  }
  
  return (
    <div key={messageKey} className="mb-4">
      <div className="flex flex-col">
        <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
          <div className={`max-w-[75%] p-3 rounded-lg ${
            message.role === 'user'
              ? 'bg-white border border-slate-200'
              : 'bg-gray-100 text-gray-800'
          }`}>
            {/* ロール表示 */}
            <div className="text-xs text-gray-500 mb-1">
              {message.role === 'user' ? 'あなた' : 'アシスタント'}
              {message.id && <span className="ml-1 text-xs text-gray-400">({messageKey.substring(0, 8)}...)</span>}
            </div>
            
            <p className="whitespace-pre-wrap">{message.content}</p>

            {/* 添付ファイルがある場合は表示 */}
            {hasAttachments && message.attachments && (
              <div className="mt-3">
                <AttachmentViewer 
                  attachments={message.attachments} 
                  key={`attach-${messageKey}`}
                />
                {/* デバッグ用：添付ファイルの情報を表示 */}
                <div className="text-xs text-gray-400 mt-1">
                  添付ファイル: {message.attachments?.length || 0}件
                  {message.attachments?.map((att, i) => (
                    <div key={`att-${messageKey}-${i}`} className="pl-2">
                      {att.fileName} 
                      {att.fileUrl ? '✓' : '×'}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* そのメッセージにリソースがある場合にのみ、直下にリソースビューアーを表示 */}
        {message.role === 'assistant' && 
          Array.isArray(message.resources) && 
           message.resources?.length > 0 && 
           resourcesVisible && (
            <div className="mt-2 ml-2">
              <ResourceViewer resources={message.resources || []} />
            </div>
          )}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // カスタム比較関数（メッセージが実質的に同じ場合は再レンダリングしない）
  if (prevProps.message.id !== nextProps.message.id) return false;
  if (prevProps.message.content !== nextProps.message.content) return false;
  if (prevProps.resourcesVisible !== nextProps.resourcesVisible) return false;
  
  // 添付ファイルの比較
  const prevAttachments = prevProps.message.attachments;
  const nextAttachments = nextProps.message.attachments;
  
  // 添付ファイルの有無の比較
  if ((!prevAttachments && nextAttachments) || (prevAttachments && !nextAttachments)) return false;
  if (prevAttachments && nextAttachments) {
    if (prevAttachments.length !== nextAttachments.length) return false;
    
    // 各添付ファイルの内容を比較
    for (let i = 0; i < prevAttachments.length; i++) {
      if (prevAttachments[i].fileId !== nextAttachments[i].fileId ||
          prevAttachments[i].fileUrl !== nextAttachments[i].fileUrl) {
        return false;
      }
    }
  }
  
  return true;
});

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
  
  // 添付ファイル情報をログに出力
  useLogAttachments(currentMessages);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // 初期化ロジック
  useEffect(() => {
    if (initialized) return;
    
    if (conversationId) {
      setConversationId(conversationId);
      clearMessages();
      
      if (initialMessages.length > 0) {
        // すべてのメッセージを追加
        initialMessages.forEach(message => addMessage(message));
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

  // メッセージリストをレンダリングする関数
  const renderMessageList = useCallback(() => {
    if (currentMessages.length === 0) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center text-gray-500">
            <h3 className="text-lg font-medium">会話を始めましょう</h3>
            <p className="text-sm">メッセージを入力してAIとチャットを開始できます</p>
          </div>
        </div>
      );
    }
    
    return (
      <>
        {currentMessages.map((message, index) => (
          <MessageItem 
            key={message.id || `msg-${index}-${Date.now()}`}
            message={message} 
            index={index}
            resourcesVisible={resourcesVisible}
          />
        ))}
      </>
    );
  }, [currentMessages, resourcesVisible]);

  return (
    <div className="flex flex-col h-full">
      {/* メッセージ表示エリア */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-4">
          {renderMessageList()}
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