// src/store/chatStore.ts
import { create } from 'zustand';

// メッセージの型定義
export type Message = {
    role: 'user' | 'assistant';
    content: string;
  }
  
  // ストアの状態の型定義
type ChatState = {
    conversations: { id: string; title: string }[];
    currentMessages: Message[];
    currentConversationId: string | null;
    isLoading: boolean;
    
    setLoading: (loading: boolean) => void;
    addMessage: (message: Message) => void;
    setConversationId: (id: string) => void;
    clearMessages: () => void;
  }

export const useChatStore = create<ChatState>((set) => ({
    // 状態
    conversations:[], //全会話リスト(サイドバー用) タイトルだけでいい気はする
    currentMessages: [], // 現在の会話のメッセージ
    currentConversationId: null,
    isLoading: false,
    
    // アクション
    setLoading: (loading) => set({ isLoading: loading }),

  // メッセージ追加
    addMessage: (message) => set((state) => ({ 
        currentMessages: [...state.currentMessages, message] 
    })),

    // 会話ID設定
    setConversationId: (id: string) => set({ currentConversationId: id }),

    // メッセージリストクリア
    clearMessages: () => set({ currentMessages: [] })

}))