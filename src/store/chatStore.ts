// src/store/chatStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
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

// 会話IDごとのリソース情報を管理する型
type ConversationResources = {
  [conversationId: string]: ResourceInfo[];
};

// ストアの状態の型定義
interface ChatStore {
  conversations: Conversation[];
  currentMessages: Message[];
  currentConversationId: string | null;
  isLoading: boolean;
  // 会話IDごとのリソース情報
  conversationResources: ConversationResources;
  
  setLoading: (loading: boolean) => void;
  addMessage: (message: Message) => void;
  setConversationId: (id: string) => void;
  clearMessages: () => void;
  // selectConversation: (conversationId: string, messages: Message[]) => void;
  // 履歴管理で追加
  setConversations: (conversations: Conversation[]) => void;
  addConversation: (conversation: Conversation) => void;
  fetchConversations: () => Promise<void>;
  // リソース情報関連の関数
  setResources: (conversationId: string, resources: ResourceInfo[]) => void;
  getResources: (conversationId: string) => ResourceInfo[] | null;
}

// zustandストアをpersistミドルウェアで拡張して永続化
export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      // 状態
      conversations:[], //全会話リスト(サイドバー用) タイトルだけでいい気はする
      currentMessages: [], // 現在の会話のメッセージ
      currentConversationId: null,
      isLoading: false,
      // 会話IDごとのリソース情報
      conversationResources: {},
      
      // アクション
      setLoading: (loading: boolean) => set({ isLoading: loading }),

      // メッセージ追加
      addMessage: (message: Message) => set((state) => {
        // リソース情報を含むアシスタントメッセージの場合、リソース情報も保存
        if (message.role === 'assistant' && message.resources && message.resources.length > 0 && state.currentConversationId) {
          // 会話IDごとのリソース情報を更新
          const updatedResources = {
            ...state.conversationResources,
            [state.currentConversationId]: message.resources
          };
          
          return {
            currentMessages: [...state.currentMessages, {
              role: message.role,
              content: message.content,
              resources: message.resources
            }],
            conversationResources: updatedResources
          };
        }
        
        return {
          currentMessages: [...state.currentMessages, {
            role: message.role,
            content: message.content,
            resources: message.resources
          }]
        };
      }),

      // 会話ID設定
      setConversationId: (id: string) => set({ currentConversationId: id }),

      // メッセージリストクリア
      clearMessages: () => set({ currentMessages: [] }),

      // 会話リスト関連の機能
      setConversations: (conversations) => set({ conversations }),
      
      addConversation: (conversation) => set((state) => {
        // 既存の会話リストに新しい会話を追加（または更新）
        const exists = state.conversations.some(
          conv => conv.conversationId === conversation.conversationId
        );
        
        if (exists) {
          // 既存の会話を更新
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
      },
      
      // リソース情報を設定
      setResources: (conversationId: string, resources: ResourceInfo[]) => set((state) => ({
        conversationResources: {
          ...state.conversationResources,
          [conversationId]: resources
        }
      })),
      
      // リソース情報を取得
      getResources: (conversationId: string) => {
        const state = get();
        return state.conversationResources[conversationId] || null;
      }
    }),
    {
      name: 'dify-chat-storage', // ローカルストレージのキー
      partialize: (state) => ({
        // 永続化する状態のみを指定
        conversationResources: state.conversationResources,
      }),
    }
  )
);