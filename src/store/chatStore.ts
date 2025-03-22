// src/store/chatStore.ts
import { create } from 'zustand';
// ResourceInfoをインポートせず、直接定義する
// import { ResourceInfo } from '@/components/ResourceViewer';

// 履歴管理で追加
export type Conversation = {
  conversationId: string;
  title: string;
  updatedAt: string;
};

// メッセージ用のリソース型を定義
export type ResourceInfo = {
  document_name: string;
  segment_position: number;
  content: string;
  score: number;
};

// メッセージの型定義
export type Message = {
  role: 'user' | 'assistant';
  content: string;
  resources?: ResourceInfo[];
};

// ストアの状態の型定義
interface ChatStore {
  conversations: Conversation[];
  currentMessages: Message[];
  currentConversationId: string | null;
  isLoading: boolean;
  
  setLoading: (loading: boolean) => void;
  addMessage: (message: Message) => void;
  setConversationId: (id: string) => void;
  clearMessages: () => void;
  // selectConversation: (conversationId: string, messages: Message[]) => void;
  // 履歴管理で追加
  setConversations: (conversations: Conversation[]) => void;
  addConversation: (conversation: Conversation) => void;
  fetchConversations: () => Promise<void>;
}

export const useChatStore = create<ChatStore>((set) => ({
  // 状態
  conversations:[], //全会話リスト(サイドバー用) タイトルだけでいい気はする
  currentMessages: [], // 現在の会話のメッセージ
  currentConversationId: null,
  isLoading: false,
  
  // アクション
  setLoading: (loading: boolean) => set({ isLoading: loading }),

  // メッセージ追加
  addMessage: (message: Message) => set((state) => ({
    currentMessages: [...state.currentMessages, {
      role: message.role,
      content: message.content,
      resources: message.resources
    }]
  })),

  // 会話ID設定
  setConversationId: (id: string) => set({ currentConversationId: id }),

  // メッセージリストクリア
  clearMessages: () => set({ currentMessages: [] }),

  // 会話リスト関連の機能
  setConversations: (conversations) => set({ conversations }),
  
  addConversation: (conversation) => set((state) => {
    // 既存の会話リストに新しい会話を追加（または更新）
    // .some 配列内の少なくとも1つの要素が指定された条件を満たすかどうか
    // conv 配列(state.conversationsの各要素)
    const exists = state.conversations.some(
      conv => conv.conversationId === conversation.conversationId
    );
    
    if (exists) {
      // 既存の会話を更新
      // .map 配列内の全ての要素に対し、提供された関数を呼び出し、結果を元に新しい配列を作成
      // convが更新すべき会話と同じIDなら新しい会話オブジェクトを返す conversation
      // そうでなければ元の会話オブジェクトconvを返す
      return {
        conversations: state.conversations.map(conv => 
          conv.conversationId === conversation.conversationId 
            ? conversation 
            : conv
        ).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      };
    } else {
      // 新しい会話を追加
      return {
        conversations: [conversation, ...state.conversations]
      };
    }
  }),
  
  // 会話一覧を取得する非同期アクション
  fetchConversations: async () => {
    try {
      const response = await fetch('/api/conversations');
      if (!response.ok) throw new Error('Failed to fetch conversations');
      const data = await response.json();
      set({ conversations: data });
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  }
}));