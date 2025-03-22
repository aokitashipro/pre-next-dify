'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useChatStore } from '@/store/chatStore';

interface ChatInputProps {
  userId: string;
  conversationId?: string;
}

export default function ChatInput({ userId, conversationId }: ChatInputProps) {
  const router = useRouter();
  const { 
    currentMessages, 
    conversations, 
    currentConversationId, 
    isLoading,          // storeから取得
    addMessage, 
    setConversationId, 
    setLoading,         // storeのsetLoading関数
    setConversations, 
    clearMessages 
  } = useChatStore();

  const [inputValue, setInputValue] = useState('');

  // マウント時に会話IDをセット
  useEffect(() => {
    if (conversationId) {
      setConversationId(conversationId);
    }
  }, [conversationId, setConversationId]);

  // ローディングメッセージを削除するカスタムアクション
  const removeLoadingMessage = () => {
    if (currentMessages.length > 0) {
      // 最後のメッセージ（ローディングメッセージ）を除く全てのメッセージで新しい配列を作成
      const updatedMessages = currentMessages.slice(0, -1);
      setConversations([...conversations]); // 更新をトリガー
      clearMessages();
      
      // 更新されたメッセージを1つずつ追加
      updatedMessages.forEach(msg => {
        addMessage(msg);
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    try {
      setLoading(true); // storeのローディング状態を更新

      // ユーザーメッセージを追加
      addMessage({
        role: 'user',
        content: inputValue,
      });

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: inputValue,
          conversation_id: conversationId,
          userId: userId,
        }),
      });

      const data = await response.json();
      console.log('API Response data:', data); // デバッグログ追加
      console.log('Full API Response:', JSON.stringify(data, null, 2));

      // リソースの型を変換して追加
      const formattedResources = data.resources?.map(resource => ({
        document_name: resource.document_name,
        segment_position: resource.segment_position,
        content: resource.content,
        score: resource.score
      })) || [];

      console.log('Formatted resources:', formattedResources);

      // アシスタントのメッセージを追加
      addMessage({
        role: 'assistant',
        content: data.answer,
        resources: formattedResources
      });

      setInputValue('');

      // 新規チャットの場合
      if (data.conversation_id && (!currentConversationId)) {
        // 新しい会話情報をストアに追加
        const newConversation = {
          conversationId: data.conversation_id,
          title: inputValue.slice(0, 30) + (inputValue.length > 30 ? '...' : ''),
          updatedAt: new Date().toISOString()
        };
        
        // 現在の会話IDを更新
        setConversationId(data.conversation_id);
        
        // ChatStoreの会話リストを更新
        setConversations([newConversation, ...conversations]);

        // URLを更新（difyConversationIdを使用）
        setTimeout(() => {
          router.push(`/chat/${data.conversation_id}`);  // ここでdifyConversationIdを使用
        }, 100);
      }
    } catch (error) {
      console.error('Error in chat:', error);
    } finally {
      setLoading(false); // storeのローディング状態を更新
    }
  };

  return (
    <div className="p-3 border-t w-full">
      <form onSubmit={handleSubmit} className="flex text-base items-center gap-2 mx-auto">
        <Textarea 
          className="md:text-base bg-white" 
          placeholder="メッセージを入力してください" 
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          disabled={isLoading}
        />
        <Button type="submit" disabled={isLoading || !inputValue.trim()}>送信</Button>
      </form>
    </div>
  );
}