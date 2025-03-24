'use client';

/**
 * チャット入力コンポーネント
 * 
 * このコンポーネントは、チャットアプリケーションの入力部分を担当し、以下の機能を提供します：
 * - テキストメッセージの入力と送信
 * - ファイルのアップロードと添付
 * - 使用制限のチェックと表示
 * - チャット応答の取得と表示
 * 
 * アプリケーションのメインチャットインターフェースで使用されます。
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useChatStore, Message, FileAttachment } from '@/store/chatStore';
import FileUpload from '@/components/FileUpload';
import { Paperclip, X, AlertCircle } from 'lucide-react';
import { canUseChat, recordChatUsage, recordFileUploadUsage } from '@/lib/actions/usage-actions';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";

/**
 * チャット入力コンポーネントのプロパティ定義
 */
interface ChatInputProps {
  /** ユーザーID - 認証されたユーザーの識別子 */
  userId: string;
  /** 会話ID - 既存の会話の場合は指定、新規会話の場合はundefined */
  conversationId?: string;
}

/**
 * チャット入力コンポーネント
 * テキスト入力とファイルアップロード機能を提供するメインコンポーネント
 */
export default function ChatInput({ userId, conversationId }: ChatInputProps) {
  // Next.jsのルーターを初期化（ページ遷移に使用）
  const router = useRouter();
  
  // グローバル状態管理用のChatStoreから必要な状態と関数を取得
  const { 
    currentMessages,      // 現在の会話のメッセージリスト
    isLoading,            // メッセージ送信中のローディング状態
    addMessage,           // メッセージを追加する関数
    updateMessage,        // メッセージを更新する関数
    replaceMessages,      // メッセージリストを置き換える関数
    setConversationId,    // 会話IDをセットする関数
    setLoading,           // ローディング状態を設定する関数
    clearMessages,        // メッセージをクリアする関数
    setResources          // リソース（参照文書など）をセットする関数
  } = useChatStore();
  
  //--------------------------------------------------
  // ローカル状態の管理
  //--------------------------------------------------
  
  // テキスト入力の状態
  const [inputValue, setInputValue] = useState('');
  
  // ファイル添付の状態
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [showFileUpload, setShowFileUpload] = useState(false);
  
  // 使用制限の状態
  const [usageStatus, setUsageStatus] = useState<{
    canUse: boolean;      // 使用可能かどうか
    reason?: string;      // 使用不可の理由
    stats?: any;          // 使用統計データ
  }>({ canUse: true });   // デフォルトは使用可能
  
  // 使用状況チェック中の状態
  const [checkingUsage, setCheckingUsage] = useState(false);
  
  // 添付ファイルの状態追跡用参照（再レンダリングの影響を受けない値を保持）
  const latestUserMessageRef = useRef<{index: number, messageId?: string}>({index: -1});
  const fileInputRef = useRef<HTMLInputElement>(null);

  //--------------------------------------------------
  // 副作用（useEffect）
  //--------------------------------------------------
  
  /**
   * 初回マウント時に使用状況をチェック
   */
  useEffect(() => {
    async function checkUsageStatus() {
      setCheckingUsage(true);
      try {
        // 使用可否をAPIで確認
        const result = await canUseChat();
        setUsageStatus(result);
      } catch (error) {
        console.error('使用状況のチェックに失敗しました:', error);
      } finally {
        setCheckingUsage(false);
      }
    }
    
    checkUsageStatus();
  }, []);

  /**
   * マウント時に会話IDをセット（既存の会話を開く場合）
   */
  useEffect(() => {
    if (conversationId) {
      setConversationId(conversationId);
    }
  }, [conversationId, setConversationId]);

  //--------------------------------------------------
  // 添付ファイル関連の処理
  //--------------------------------------------------
  
  /**
   * 添付ファイル情報を更新する関数
   * ユーザーメッセージの添付ファイル情報をサーバーからの応答で更新
   * 
   * @param userMsgIndex 更新対象のユーザーメッセージのインデックス
   * @param responseAttachments サーバーから返された添付ファイル情報
   * @returns 更新成功かどうかのフラグ
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
      // 添付ファイル情報を更新（サーバーから取得したIDやURLで上書き）
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
   * @param files 選択されたファイルの配列
   */
  const handleFilesSelected = (files: File[]) => {
    setSelectedFiles(files);
  };

  /**
   * ファイルのアップロードを処理する関数
   * @param files アップロードするファイルの配列
   * @returns アップロードされたファイル情報の配列
   */
  const uploadFiles = async (files: File[]): Promise<FileAttachment[]> => {
    if (!files.length) return [];
    
    try {
      // FormDataを作成（マルチパートフォームデータでファイル送信）
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
   * @param e ファイル選択イベント
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
   * ファイルアップロードUIの表示/非表示を切り替え
   */
  const handleAttachmentClick = useCallback(() => {
    setShowFileUpload(prev => !prev);
  }, []);

  //--------------------------------------------------
  // チャット送信関連の処理
  //--------------------------------------------------
  
  /**
   * チャット送信時のフォーム処理
   * @param e フォーム送信イベント
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 入力がない場合は何もしない（空白のみの場合も送信しない）
    if (!inputValue.trim() && selectedFiles.length === 0) return;
    
    // 使用状況を再チェック（直前に確認）
    setCheckingUsage(true);
    const usageCheck = await canUseChat();
    setUsageStatus(usageCheck);
    setCheckingUsage(false);
    
    // 使用制限に達している場合は処理を中断
    if (!usageCheck.canUse) {
      return;
    }
    
    // 送信前にローディング状態を設定
    setLoading(true);
    
    try {
      // ファイル情報をクライアント側で作成（表示用の一時情報）
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
      
      // 使用状況を記録（統計用）
      await recordChatUsage(data.tokens_used || 0);
      
      // ファイルがある場合はファイルのアップロード記録も追加
      if (selectedFiles.length > 0) {
        await recordFileUploadUsage(selectedFiles.length, 0);
      }
      
      // アシスタントからの応答を処理
      if (data.answer) {
        // サーバーからの添付ファイル情報（永続化されたファイル情報）
        const serverFiles = data.files || [];
        
        // 元のユーザーメッセージの位置を特定
        const currentMessages = useChatStore.getState().currentMessages;
        const userMessageIndex = currentMessages.findIndex(msg => msg.id === userMessageId);
        
        // 添付ファイル情報を更新（一時的なIDを永続的なIDに置き換え）
        if (userMessageIndex !== -1 && serverFiles.length > 0) {
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
        
        // 使用状況を更新（画面に表示するため）
        const newUsageCheck = await canUseChat();
        setUsageStatus(newUsageCheck);
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

  //--------------------------------------------------
  // UI関連の処理
  //--------------------------------------------------
  
  /**
   * 使用制限のアラートを表示するコンポーネント
   * 使用制限に達した場合のみ表示
   */
  const renderUsageAlert = () => {
    if (!usageStatus.canUse && usageStatus.reason) {
      return (
        <Alert variant="destructive" className="mb-3">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>使用制限に達しました</AlertTitle>
          <AlertDescription>
            {usageStatus.reason}
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2" 
              onClick={() => router.push('/pricing')}
            >
              プランをアップグレード
            </Button>
          </AlertDescription>
        </Alert>
      );
    }
    return null;
  };

  //--------------------------------------------------
  // コンポーネントのレンダリング
  //--------------------------------------------------
  return (
    <div className="p-3 border-t w-full">
      {/* 使用制限アラート（該当する場合のみ表示） */}
      {renderUsageAlert()}
      
      {/* ファイルアップロードUI（トグル表示） */}
      {showFileUpload && (
        <div className="mb-3">
          <FileUpload 
            onFilesSelected={handleFilesSelected}
            selectedFiles={selectedFiles}
            setSelectedFiles={setSelectedFiles}
            disabled={!usageStatus.canUse || checkingUsage}
            maxFiles={usageStatus.stats?.limits?.MONTHLY_UPLOADS || 5}
          />
        </div>
      )}
      
      {/* メッセージ入力フォーム */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-2 mx-auto">
        <div className="flex text-base items-center gap-2">
          {/* ファイル添付ボタン */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleAttachmentClick}
            className="flex-shrink-0"
            disabled={!usageStatus.canUse || checkingUsage}
          >
            {showFileUpload ? <X className="h-5 w-5" /> : <Paperclip className="h-5 w-5" />}
          </Button>
          
          {/* テキスト入力エリア */}
          <Textarea 
            className="md:text-base bg-white" 
            placeholder={
              !usageStatus.canUse 
                ? "制限に達しました" 
                : selectedFiles.length > 0 
                  ? "ファイルについて質問する..." 
                  : "メッセージを入力してください"
            } 
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={isLoading || !usageStatus.canUse || checkingUsage}
          />
          
          {/* 送信ボタン */}
          <Button 
            type="submit" 
            disabled={
              isLoading || 
              (!inputValue.trim() && selectedFiles.length === 0) || 
              !usageStatus.canUse || 
              checkingUsage
            }
          >
            送信
          </Button>
        </div>
        
        {/* 添付ファイル情報（ファイルが選択されている場合のみ表示） */}
        {selectedFiles.length > 0 && !showFileUpload && (
          <div className="flex items-center ml-10 text-sm text-gray-500">
            <Paperclip className="h-3 w-3 mr-1" />
            <span>{selectedFiles.length}個のファイルを添付済み</span>
          </div>
        )}
        
        {/* ローディング表示 */}
        {isLoading && (
          <div className="flex items-center ml-10 text-sm text-gray-500">
            <span>応答を待っています...</span>
          </div>
        )}
        
        {/* 使用状況チェック中の表示 */}
        {checkingUsage && (
          <div className="flex items-center ml-10 text-sm text-gray-500">
            <span>使用状況を確認中...</span>
          </div>
        )}
      </form>
    </div>
  );
}