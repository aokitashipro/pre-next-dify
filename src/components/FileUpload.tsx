'use client';
import React, { useCallback, useState, useRef, useEffect } from 'react';
import { FileText, Image, Music, Video, X, AlertCircle, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { canUseChat } from '@/lib/actions/usage-actions';
import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert";

/**
 * サポートされるファイル形式の定義
 * 各カテゴリごとに対応するMIMEタイプを配列で指定
 */
const ACCEPTED_FILE_TYPES = {
  'image': ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  'document': [
    'application/pdf', 
    'text/plain', 
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/csv'
  ],
  'audio': ['audio/mpeg', 'audio/wav', 'audio/ogg'],
  'video': ['video/mp4', 'video/webm', 'video/ogg']
};

// 最大ファイルサイズ (MB)
const MAX_FILE_SIZE_MB = 10;

/**
 * FileUploadコンポーネントのプロパティ
 */
interface FileUploadProps {
  /** 選択されたファイルを親コンポーネントに通知するコールバック */
  onFilesSelected: (files: File[]) => void;
  /** 現在選択されているファイルの配列 */
  selectedFiles: File[];
  /** 選択ファイルを更新する関数 */
  setSelectedFiles: (files: File[]) => void;
  /** 最大ファイルサイズ (MB) */
  maxFileSizeMB?: number;
  /** 最大アップロード数 */
  maxFiles?: number;
  /** アップロード無効フラグ */
  disabled?: boolean;
}

/**
 * ファイルアップロードコンポーネント
 * 
 * このコンポーネントは、ドラッグ＆ドロップまたはファイル選択ダイアログによる
 * ファイルのアップロードUIを提供します。以下の機能を持ちます：
 * - ドラッグ＆ドロップによるファイル選択
 * - ファイル選択ダイアログによるファイル選択
 * - ファイルタイプとサイズの検証
 * - 選択済みファイル一覧の表示と削除
 * - 使用状況に基づく制限の適用
 */
export default function FileUpload({ 
  onFilesSelected, 
  selectedFiles, 
  setSelectedFiles, 
  maxFileSizeMB = MAX_FILE_SIZE_MB, 
  maxFiles = 5,
  disabled = false
}: FileUploadProps) {
  // ドラッグ操作の状態を管理
  const [dragActive, setDragActive] = useState(false);
  // ファイル入力要素への参照
  const inputRef = useRef<HTMLInputElement>(null);
  // エラーメッセージ状態
  const [error, setError] = useState<string | null>(null);
  // 使用制限状態
  const [usageStatus, setUsageStatus] = useState<{
    canUse: boolean;
    uploadDisabled?: boolean;
    reason?: string;
  }>({ canUse: true });

  // マウント時に使用状況をチェック
  useEffect(() => {
    async function checkUsageStatus() {
      try {
        const result = await canUseChat();
        setUsageStatus(result);
      } catch (error) {
        console.error('ファイルアップロード使用状況のチェックに失敗しました:', error);
      }
    }
    
    checkUsageStatus();
  }, []);

  /**
   * ファイル選択ダイアログからのファイル追加を処理
   */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // アップロード制限チェック
    if (usageStatus.uploadDisabled) {
      setError(usageStatus.reason || 'アップロード制限に達しました');
      return;
    }
    
    if (disabled || !usageStatus.canUse) {
      setError('アップロードは現在無効です');
      return;
    }

    if (e.target.files && e.target.files.length > 0) {
      // 最大ファイル数チェック
      if (selectedFiles.length + e.target.files.length > maxFiles) {
        setError(`アップロードできるファイルは最大${maxFiles}個までです`);
        return;
      }
      
      const filesArray = Array.from(e.target.files);
      const validFiles = validateFiles(filesArray);
      
      // 有効なファイルを現在の選択に追加
      const updatedFiles = [...selectedFiles, ...validFiles];
      setSelectedFiles(updatedFiles);
      onFilesSelected(updatedFiles);
      setError(null);
    }
  };

  /**
   * ファイルのバリデーション処理
   * サイズと形式をチェックし、有効なファイルのみを返す
   */
  const validateFiles = (files: File[]): File[] => {
    const validFiles: File[] = [];
    
    for (const file of files) {
      // ファイルサイズのチェック (MB単位)
      const fileSizeMB = file.size / (1024 * 1024);
      if (fileSizeMB > maxFileSizeMB) {
        setError(`ファイル ${file.name} のサイズが大きすぎます (最大 ${maxFileSizeMB}MB)`);
        continue;
      }

      // サポートされているファイル形式かチェック
      const isSupported = Object.values(ACCEPTED_FILE_TYPES).some(
        types => types.includes(file.type)
      );
      
      if (!isSupported) {
        setError(`ファイル ${file.name} の形式はサポートされていません`);
        continue;
      }

      validFiles.push(file);
    }
    
    return validFiles;
  };

  /**
   * ドラッグイベントのハンドラ
   * ドラッグ開始/終了時の視覚的フィードバックを管理
   */
  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    // ドラッグの状態を更新
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  /**
   * ドロップイベントのハンドラ
   * ドロップされたファイルを処理
   */
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    // アップロード制限チェック
    if (usageStatus.uploadDisabled) {
      setError(usageStatus.reason || 'アップロード制限に達しました');
      return;
    }
    
    if (disabled || !usageStatus.canUse) {
      setError('アップロードは現在無効です');
      return;
    }
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      // 最大ファイル数チェック
      if (selectedFiles.length + e.dataTransfer.files.length > maxFiles) {
        setError(`アップロードできるファイルは最大${maxFiles}個までです`);
        return;
      }
      
      const filesArray = Array.from(e.dataTransfer.files);
      const validFiles = validateFiles(filesArray);
      
      // 有効なファイルを現在の選択に追加
      const updatedFiles = [...selectedFiles, ...validFiles];
      setSelectedFiles(updatedFiles);
      onFilesSelected(updatedFiles);
      setError(null);
    }
  };

  /**
   * 特定のファイルを選択から削除
   */
  const removeFile = (index: number) => {
    const newFiles = [...selectedFiles];
    newFiles.splice(index, 1);
    setSelectedFiles(newFiles);
    onFilesSelected(newFiles);
    setError(null);
  };

  /**
   * ファイル種別に応じたアイコンを取得
   */
  const getFileIcon = (file: File) => {
    const fileType = file.type;
    
    if (ACCEPTED_FILE_TYPES.image.includes(fileType)) {
      return <Image className="w-5 h-5" />;
    } else if (ACCEPTED_FILE_TYPES.document.includes(fileType)) {
      return <FileText className="w-5 h-5" />;
    } else if (ACCEPTED_FILE_TYPES.video.includes(fileType)) {
      return <Video className="w-5 h-5" />;
    } else if (ACCEPTED_FILE_TYPES.audio.includes(fileType)) {
      return <Music className="w-5 h-5" />;
    }
    
    return <FileText className="w-5 h-5" />;
  };

  /**
   * ファイルのサイズをフォーマット
   */
  const formatFileSize = (size: number): string => {
    if (size < 1024) {
      return `${size} B`;
    } else if (size < 1024 * 1024) {
      return `${(size / 1024).toFixed(1)} KB`;
    } else {
      return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    }
  };

  // アップロードが無効かどうか
  const isUploadDisabled = disabled || usageStatus.uploadDisabled || !usageStatus.canUse;

  // 使用制限に達している場合のアラート
  const renderUsageAlert = () => {
    if (!usageStatus.canUse && usageStatus.reason) {
      return (
        <Alert variant="destructive" className="mb-3">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {usageStatus.reason}
          </AlertDescription>
        </Alert>
      );
    }
    return null;
  };

  return (
    <div className="w-full bg-white p-4 rounded-md border">
      {/* 使用制限アラート */}
      {renderUsageAlert()}
      
      {/* ファイルアップロードエリア */}
      <div
        className={`border-2 border-dashed rounded-md p-4 text-center cursor-pointer ${
          dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
        } ${isUploadDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        onClick={() => !isUploadDisabled && inputRef.current?.click()}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        aria-label="ファイルアップロードエリア"
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          onChange={handleFileChange}
          className="hidden"
          accept={Object.values(ACCEPTED_FILE_TYPES).flat().join(',')}
          aria-label="ファイル選択"
          disabled={isUploadDisabled}
        />
        
        {dragActive ? (
          <p className="text-blue-500">ファイルをここにドロップ...</p>
        ) : (
          <div className="space-y-2">
            <Plus className="mx-auto h-8 w-8 text-gray-400" />
            <p className="text-sm text-gray-500">
              {isUploadDisabled 
                ? (usageStatus.reason || 'アップロードは現在無効です') 
                : 'クリックまたはドラッグ&ドロップでファイルをアップロード'}
            </p>
            <p className="text-xs text-gray-400">
              最大{maxFiles}ファイル、各{maxFileSizeMB}MBまで
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-2 text-sm text-red-500">
          <p>{error}</p>
        </div>
      )}

      {/* 選択されたファイル一覧 */}
      {selectedFiles.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-medium">添付ファイル ({selectedFiles.length})</h4>
          <div className="space-y-2 mt-2">
            {selectedFiles.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center justify-between p-2 bg-gray-50 rounded-md"
              >
                <div className="flex items-center space-x-2 max-w-[85%]">
                  {getFileIcon(file)}
                  <span className="text-sm truncate">{file.name}</span>
                  <span className="text-xs text-gray-500">
                    {formatFileSize(file.size)}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(index);
                  }}
                  aria-label={`${file.name}を削除`}
                  className="h-6 w-6 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 