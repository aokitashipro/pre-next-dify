'use client';
import { useEffect, useRef, useState, useMemo } from 'react';
import { useChatStore, Message, ResourceInfo } from '@/store/chatStore';
import ChatInput from '@/components/ChatInput';
import ResourceViewer from '@/components/ResourceViewer';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ChatContainerProps {
  userId: string;
  initialMessages?: Message[]; // 初期メッセージ (オプショナル)
  conversationId?: string;    // 会話ID (オプショナル)
}

export default function ChatContainer({ userId, initialMessages = [], conversationId }: ChatContainerProps) {
  // デバッグよう
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  // リソース表示用のState - デフォルトで表示
  const [resourcesVisible, setResourcesVisible] = useState(true);

  const { 
    currentMessages, 
    setConversationId,
    clearMessages,
    addMessage,
    conversationResources,
    getResources,
    setResources,
    currentConversationId
  } = useChatStore();
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [initialized, setInitialized] = useState(false);
  
  // 現在の会話IDからリソース情報を取得
  const currentResources = useMemo(() => {
    if (!currentConversationId) return null;
    return getResources(currentConversationId);
  }, [currentConversationId, conversationResources, getResources]);
  
  // 初期化ロジック
  useEffect(() => {
    if (initialized) return;
    
    if (conversationId) {
      setConversationId(conversationId);
      
      // 既存のメッセージをクリアして初期メッセージをセット
      clearMessages();
      if (initialMessages.length > 0) {
        initialMessages.forEach(message => {
          addMessage(message);
        });
        
        // 初期メッセージからリソース情報を抽出して保存
        const initResources = extractResourcesFromMessages(initialMessages);
        if (initResources.length > 0) {
          console.log(`ChatContainer: ${initResources.length}件のリソースを初期化します`);
          setResources(conversationId, initResources);
        }
      }
    } else {
      // 新規会話の場合はメッセージをクリア
      clearMessages();
    }
    
    setInitialized(true);
  }, [conversationId, initialMessages, setConversationId, clearMessages, addMessage, initialized, setResources]);

  // メッセージが追加されたら自動スクロール
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentMessages]);

  // メッセージが更新されたら、最新のリソースを探して保存
  useEffect(() => {
    if (!currentMessages || currentMessages.length === 0 || !currentConversationId) return;
    
    // アシスタントのメッセージを逆順から探す
    for (let i = currentMessages.length - 1; i >= 0; i--) {
      const message = currentMessages[i];
      if (message.role === 'assistant' && message.resources && message.resources.length > 0) {
        console.log('最新のリソースが見つかりました:', message.resources.length, '件');
        // グローバルストアにリソース情報を保存
        setResources(currentConversationId, message.resources);
        return;
      }
    }
  }, [currentMessages, currentConversationId, setResources]);

  // メッセージ配列からリソース情報を抽出するヘルパー関数
  const extractResourcesFromMessages = (messages: Message[]): ResourceInfo[] => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      if (message.role === 'assistant' && message.resources && message.resources.length > 0) {
        return message.resources;
      }
    }
    return [];
  };

  // リソース表示部分（固定位置）
  const renderResourceViewer = () => {
    if (!currentResources || !resourcesVisible) return null;

    return (
      <div className="border-t-2 border-gray-200 pt-4 mt-4">
        <div className="flex justify-between mb-4">
          <h3 className="text-lg font-bold">参考資料</h3>
          <button 
            className="px-4 py-2 bg-blue-500 text-white rounded"
            onClick={() => setResourcesVisible(!resourcesVisible)}
          >
            {resourcesVisible ? '非表示' : '表示'}
          </button>
        </div>
        <ResourceViewer resources={currentResources} />
      </div>
    );
  };

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
              {/* 通常のメッセージリスト */}
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
                  </div>
                </div>
              ))}
              
              {/* リソース表示部分（固定部分） */}
              {renderResourceViewer()}
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