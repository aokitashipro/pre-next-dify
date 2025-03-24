'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useChatStore, Message, FileAttachment } from '@/store/chatStore';
import FileUpload from '@/components/FileUpload';
import { Paperclip, X } from 'lucide-react';

/**
 * チャット入力コンポーネントのプロパティ
 */
interface ChatInputProps {
  /** ユーザーID */
  userId: string;
  /** 会話ID (新規会話の場合はundefined) */
  conversationId?: string;
}

/**
 * チャット入力コンポーネント
 * テキスト入力とファイルアップロード機能を提供
 */
export default function ChatInput({ userId, conversationId }: ChatInputProps) {
  const router = useRouter();
  
  // chatStoreから必要な状態と関数を取得
  const { 
    currentMessages, 
    conversations, 
    currentConversationId, 
    isLoading,
    addMessage, 
    updateMessage,
    replaceMessages,
    setConversationId, 
    setLoading,
    setConversations, 
    clearMessages,
    setResources
  } = useChatStore();
  
  // 入力と選択ファイルの状態
  const [inputValue, setInputValue] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [showFileUpload, setShowFileUpload] = useState(false);
  
  // 添付ファイルの状態追跡用参照
  const latestUserMessageRef = useRef<{index: number, messageId?: string}>({index: -1});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // マウント時に会話IDをセット
  useEffect(() => {
    if (conversationId) {
      setConversationId(conversationId);
    }
  }, [conversationId, setConversationId]);

  /**
   * 添付ファイル情報を更新する関数
   * ユーザーメッセージの添付ファイル情報をサーバーからの応答で更新
   */
  const updateAttachmentInfo = useCallback((userMsgIndex: number, responseAttachments: FileAttachment[]) => {
    // インデックスの有効性をチェック
    if (userMsgIndex < 0 || userMsgIndex >= currentMessages.length) {
      console.error("有効なユーザーメッセージインデックスがありません");
      return false;
    }

    const userMsg = currentMessages[userMsgIndex];
    
    // 更新対象メッセージのバリデーション
    if (userMsg.role !== 'user' || !userMsg.attachments || userMsg.attachments.length === 0) {
      console.error("更新対象のユーザーメッセージには添付ファイルがありません");
      return false;
    }

    console.log(`ユーザーメッセージ(インデックス: ${userMsgIndex})の添付ファイル情報を更新します`);
    
    try {
      // 添付ファイル情報を更新
      const updatedAttachments = userMsg.attachments.map((att, idx) => {
        if (idx < responseAttachments.length) {
          return {
            ...att,
            fileUrl: responseAttachments[idx]?.fileUrl || att.fileUrl,
            fileId: responseAttachments[idx]?.fileId || att.fileId
          };
        }
        return att;
      });
      
      // メッセージを更新して状態を変更
      const updatedMessages = [...currentMessages];
      updatedMessages[userMsgIndex] = {
        ...userMsg,
        attachments: updatedAttachments
      };
      
      // メッセージリストを置き換え
      replaceMessages(updatedMessages);
      
      console.log("添付ファイル情報の更新が完了しました");
      return true;
    } catch (error) {
      console.error("添付ファイル情報の更新中にエラーが発生しました:", error);
      return false;
    }
  }, [currentMessages, replaceMessages]);

  /**
   * FileUploadコンポーネントからファイル選択を受け取るコールバック
   */
  const handleFilesSelected = (files: File[]) => {
    setSelectedFiles(files);
  };

  /**
   * ファイルのアップロードを処理する関数
   * 専用のアップロードAPIを使用
   */
  const uploadFiles = async (files: File[]): Promise<FileAttachment[]> => {
    if (!files.length) return [];
    
    try {
      // FormDataを作成
      const formData = new FormData();
      
      // 各ファイルをFormDataに追加
      files.forEach(file => formData.append('files', file));
      
      // APIエンドポイントにアップロード
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('ファイルのアップロードに失敗しました');
      }
      
      const data = await response.json();
      console.log('ファイルアップロード成功:', data);
      
      // アップロードされたファイル情報を返す
      return data.files;
    } catch (error) {
      console.error('ファイルアップロード中にエラーが発生しました:', error);
      return [];
    }
  };

  /**
   * 入力フィールドからのファイル選択を処理
   */
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      // 選択されたファイルを既存の配列に追加
      const newFiles = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...newFiles]);
      
      // ファイル選択後にinputの値をリセット（同じファイルを連続で選択できるように）
      e.target.value = '';
    }
  };

  /**
   * ファイル添付ボタンのクリックハンドラ
   */
  const handleAttachmentClick = useCallback(() => {
    setShowFileUpload(prev => !prev);
  }, []);

  /**
   * チャット送信時のフォーム処理
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 入力がない場合は何もしない（空白のみの場合も送信しない）
    if (!inputValue.trim() && selectedFiles.length === 0) return;
    
    // 送信前にローディング状態を設定
    setLoading(true);
    
    try {
      // ファイル情報をクライアント側で作成（表示用）
      const clientFiles: FileAttachment[] = selectedFiles.map((file, index) => {
        const localId = `local-${Date.now()}-${index}`;
        
        return {
          fileId: localId, // 一時的なID
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          localId, // トラッキング用
        };
      });
      
      // ユーザーメッセージを追加（アップロード前の情報を使用）
      const userMessageId = addMessage({
        role: 'user',
        content: inputValue,
        attachments: clientFiles,
      });
      
      console.log('ユーザーメッセージを追加しました:', {
        content: inputValue,
        attachments: clientFiles,
      });
      
      // 入力フィールドをクリア
      setInputValue('');
      setSelectedFiles([]);
      setShowFileUpload(false);
      
      // FormDataを使用してAPIリクエストを準備
      const formData = new FormData();
      formData.append('user', userId);
      if (conversationId) {
        formData.append('conversation_id', conversationId);
      }
      formData.append('query', inputValue);
      formData.append('response_mode', 'streaming');
      
      // ファイルを直接FormDataに追加
      if (selectedFiles.length > 0) {
        selectedFiles.forEach(file => formData.append('files', file));
        console.log(`${selectedFiles.length}個のファイルを添付してAPIリクエストを送信します`);
      }
      
      // APIリクエストを送信
      const response = await fetch('/api/chat', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('APIリクエストに失敗しました');
      }
      
      const data = await response.json();
      
      // アシスタントからの応答を処理
      if (data.answer) {
        // サーバーからの添付ファイル情報
        const serverFiles = data.files || [];
        
        // 元のユーザーメッセージの位置を特定
        const currentMessages = useChatStore.getState().currentMessages;
        const userMessageIndex = currentMessages.findIndex(msg => msg.id === userMessageId);
        
        if (userMessageIndex !== -1 && serverFiles.length > 0) {
          // 添付ファイル情報を更新
          updateAttachmentInfo(userMessageIndex, serverFiles);
        }
        
        // アシスタントの応答を追加
        addMessage({
          role: 'assistant',
          content: data.answer,
          resources: data.resources || [],
        });
        
        // 会話履歴から会話IDを取得
        const newConversationId = data.conversation_id;
        
        // 新しい会話IDがある場合は、そのIDで会話を更新
        if (newConversationId && !conversationId) {
          setConversationId(newConversationId);
          
          // URLを更新（会話ページへ遷移）
          router.push(`/chat/${newConversationId}`);
        }
      }
    } catch (error) {
      console.error('メッセージ送信中にエラーが発生しました:', error);
      
      // エラーメッセージを表示
      addMessage({
        role: 'assistant',
        content: 'メッセージの送信中にエラーが発生しました。もう一度お試しください。',
      });
    } finally {
      // ローディング状態を解除
      setLoading(false);
    }
  };

  return (
    <div className="p-3 border-t w-full">
      {showFileUpload && (
        <div className="mb-3">
          <FileUpload 
            onFilesSelected={handleFilesSelected}
            selectedFiles={selectedFiles}
            setSelectedFiles={setSelectedFiles}
          />
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="flex flex-col gap-2 mx-auto">
        <div className="flex text-base items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleAttachmentClick}
            className="flex-shrink-0"
          >
            {showFileUpload ? <X className="h-5 w-5" /> : <Paperclip className="h-5 w-5" />}
          </Button>
          
          <Textarea 
            className="md:text-base bg-white" 
            placeholder={selectedFiles.length > 0 ? "ファイルについて質問する..." : "メッセージを入力してください"} 
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={isLoading}
          />
          
          <Button 
            type="submit" 
            disabled={isLoading || (!inputValue.trim() && selectedFiles.length === 0)}
          >
            送信
          </Button>
        </div>
        
        {selectedFiles.length > 0 && !showFileUpload && (
          <div className="flex items-center ml-10 text-sm text-gray-500">
            <Paperclip className="h-3 w-3 mr-1" />
            <span>{selectedFiles.length}個のファイルを添付済み</span>
          </div>
        )}
        
        {isLoading && (
          <div className="flex items-center ml-10 text-sm text-gray-500">
            <span>応答を待っています...</span>
          </div>
        )}
      </form>
    </div>
  );
}