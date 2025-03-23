// src/store/chatStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
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

// 添付ファイル情報の型定義
export type FileAttachment = {
  fileId?: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  fileUrl?: string;
  localId?: string; // 一時的に使用する内部ID
};

// メッセージの型定義
export type Message = {
  id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  resources?: ResourceInfo[];
  attachments?: FileAttachment[]; // 添付ファイル情報を追加
  createdAt?: number;
};

// 会話IDごとのリソース情報を管理する型
type ConversationResources = {
  [conversationId: string]: ResourceInfo[];
};

// ディープコピー関数を追加
function deepCopy<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => deepCopy(item)) as unknown as T;
  }

  const copied = {} as T;
  Object.keys(obj as object).forEach(key => {
    const typedKey = key as keyof T;
    copied[typedKey] = deepCopy((obj as T)[typedKey]);
  });

  return copied;
}

// ストアの状態の型定義
interface ChatStore {
  conversations: Conversation[];
  currentMessages: Message[];
  currentConversationId: string | null;
  isLoading: boolean;
  // 会話IDごとのリソース情報
  conversationResources: ConversationResources;
  resources: Record<string, ResourceInfo[]>; // { conversationId: resources[] }
  
  setLoading: (loading: boolean) => void;
  addMessage: (message: Message) => void;
  updateMessage: (id: string, content: string) => void;
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
  replaceMessages: (messages: Message[]) => void; // メッセージリストを完全に置き換える
}

// メッセージに一意のIDを生成する関数
const generateMessageId = () => `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

// メッセージ添付ファイル情報を安全にディープコピーする関数
const deepCopyAttachments = (attachments?: FileAttachment[]) => {
  if (!attachments) return undefined;
  return attachments.map(att => ({...att}));
};

// メッセージをディープコピーする関数
const deepCopyMessage = (message: Message): Message => {
  return {
    ...message,
    id: message.id || generateMessageId(),
    resources: message.resources ? [...message.resources] : undefined,
    attachments: deepCopyAttachments(message.attachments)
  };
};

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
      resources: {},
      
      // アクション
      setLoading: (loading: boolean) => set({ isLoading: loading }),

      // メッセージ追加
      addMessage: (message: Message) => set((state) => {
        console.log(`ChatStore: メッセージを追加 (${message.role})`, 
          message.attachments ? `添付ファイル: ${message.attachments.length}件` : "添付ファイルなし");
        
        if (message.attachments && message.attachments.length > 0) {
          console.log(`ChatStore: 添付ファイル詳細:`, 
            message.attachments.map(a => `${a.fileName}(${a.fileId || 'ID未設定'})`));
        }
        
        // メッセージをディープコピーして不変性を保証
        const messageCopy = deepCopyMessage(message);
        
        // リソース情報を含むアシスタントメッセージの場合、リソース情報も保存
        if (message.role === 'assistant' && message.resources && message.resources.length > 0 && state.currentConversationId) {
          // 会話IDごとのリソース情報を更新
          const updatedResources = {
            ...state.conversationResources,
            [state.currentConversationId]: message.resources
          };
          
          return {
            currentMessages: [...state.currentMessages, messageCopy],
            conversationResources: updatedResources
          };
        }
        
        // 通常のメッセージ追加
        return {
          currentMessages: [...state.currentMessages, messageCopy]
        };
      }),

      // 特定インデックスのメッセージを更新
      updateMessage: (id, content) => set((state) => ({
        currentMessages: state.currentMessages.map(message => 
          message.id === id ? { ...message, content } : message
        )
      })),

      // メッセージリストを完全に置き換え
      replaceMessages: (messages: Message[]) => {
        console.log(`ChatStore: メッセージリストを ${messages.length} 件のメッセージで置き換えます`);
        
        // 各メッセージをディープコピー
        const messagesCopy = messages.map(deepCopyMessage);
        
        set({ currentMessages: messagesCopy });
      },

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
      storage: createJSONStorage(() => localStorage), // 明示的にJSONStorageを使用
      partialize: (state) => ({
        // 永続化する状態のみを指定
        conversationResources: state.conversationResources,
        currentMessages: state.currentMessages,       // メッセージリストを永続化
        currentConversationId: state.currentConversationId, // 現在の会話IDも永続化
        conversations: state.conversations,           // 会話リストも永続化
      }),
    }
  )
);