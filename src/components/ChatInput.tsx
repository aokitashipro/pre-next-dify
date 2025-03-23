'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useChatStore, Message, FileAttachment } from '@/store/chatStore';
import FileUpload from '@/components/FileUpload';
import { Paperclip, X } from 'lucide-react';

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
    isLoading,           // storeから取得
    addMessage, 
    updateMessage,       // 個別メッセージ更新用
    replaceMessages,     // メッセージ一括置換用
    setConversationId, 
    setLoading,          // storeのsetLoading関数
    setConversations, 
    clearMessages,
    setResources
  } = useChatStore();

  // conversationIdはpropsで受け取る
  const currentConversationIdState = conversationId;
  
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

  // 添付ファイル情報を更新する関数をメモ化
  const updateAttachmentInfo = useCallback((userMsgIndex: number, responseAttachments: FileAttachment[]) => {
    if (userMsgIndex < 0 || userMsgIndex >= currentMessages.length) {
      console.error("有効なユーザーメッセージインデックスがありません");
      return false;
    }

    const userMsg = currentMessages[userMsgIndex];
    
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
      
      // メッセージの一部のみを更新（参照は変えず、プロパティのみ更新）
      const updatedMsg = {
        ...userMsg,
        attachments: updatedAttachments
      };
      
      // 現在のすべてのメッセージをコピー
      const allMessages = [...currentMessages];
      
      // 特定のメッセージだけを置き換え
      allMessages[userMsgIndex] = updatedMsg;
      
      // 完全に置き換える（一括更新）
      replaceMessages(allMessages);
      
      console.log("添付ファイル情報の更新が完了しました");
      return true;
    } catch (error) {
      console.error("添付ファイル情報の更新中にエラーが発生しました:", error);
      return false;
    }
  }, [currentMessages, replaceMessages]);

  const handleFilesSelected = (files: File[]) => {
    setSelectedFiles(files);
  };

  // ファイルのアップロードを処理する関数
  const uploadFiles = async (files: File[]): Promise<FileAttachment[]> => {
    if (!files.length) return [];
    
    try {
      // FormDataを作成
      const formData = new FormData();
      
      // 各ファイルをFormDataに追加
      for (const file of files) {
        formData.append('files', file);
      }
      
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

  // ファイル選択ハンドラ
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...newFiles]);
      // ファイル選択後にinputの値をリセット（同じファイルを連続で選択できるように）
      e.target.value = '';
    }
  };

  // フォーム送信ハンドラ
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
        for (const file of selectedFiles) {
          formData.append('files', file);
        }
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
          // クライアント側の添付ファイル情報とサーバー側の情報をマージ
          const userMessage = currentMessages[userMessageIndex];
          
          if (userMessage.attachments && userMessage.attachments.length > 0) {
            // サーバー側の情報でクライアント側の情報を更新
            const updatedAttachments = userMessage.attachments.map((attachment, index) => {
              if (index < serverFiles.length) {
                const serverFile = serverFiles[index];
                // サーバー情報でクライアント情報を更新
                return {
                  ...attachment,
                  fileId: serverFile.fileId,
                  fileUrl: serverFile.fileUrl
                };
              }
              return attachment;
            });
            
            // 更新されたメッセージを作成
            const updatedMessage = {
              ...userMessage,
              attachments: updatedAttachments
            };
            
            // メッセージストアを直接更新
            useChatStore.setState((state) => ({
              currentMessages: state.currentMessages.map((msg) => 
                msg.id === userMessageId ? updatedMessage : msg
              )
            }));
            
            console.log('ユーザーメッセージの添付ファイル情報を更新しました:', updatedAttachments);
          }
        }
        
        // アシスタントのメッセージを追加
        addMessage({
          role: 'assistant',
          content: data.answer,
          resources: data.resources || []
        });
        
        // リソースがある場合は保存
        if (data.resources && data.resources.length > 0 && conversationId) {
          console.log(`ChatInput: ${data.resources.length}件のリソースを保存します`);
          setResources(conversationId, data.resources);
        }
      }
    } catch (error) {
      console.error('送信中にエラーが発生しました:', error);
      // エラーメッセージを表示
      addMessage({
        role: 'assistant',
        content: 'すみません、エラーが発生しました。もう一度お試しください。'
      });
    } finally {
      // 処理完了後にローディング状態を解除
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
            onClick={() => setShowFileUpload(!showFileUpload)}
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