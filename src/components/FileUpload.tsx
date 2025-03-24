'use client';
import { useState, useRef } from 'react';
import { Upload, X, File, Image, FileText, Film, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
}

/**
 * ファイルアップロードコンポーネント
 * ドラッグ&ドロップとファイル選択ダイアログに対応
 */
export default function FileUpload({ onFilesSelected, selectedFiles, setSelectedFiles }: FileUploadProps) {
  // ドラッグ操作の状態を管理
  const [dragActive, setDragActive] = useState(false);
  // ファイル入力要素への参照
  const inputRef = useRef<HTMLInputElement>(null);

  /**
   * ファイル選択ダイアログからのファイル追加を処理
   */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      const validFiles = validateFiles(filesArray);
      
      // 有効なファイルを現在の選択に追加
      const updatedFiles = [...selectedFiles, ...validFiles];
      setSelectedFiles(updatedFiles);
      onFilesSelected(updatedFiles);
    }
  };

  /**
   * ファイルのバリデーション処理
   * サイズと形式をチェックし、有効なファイルのみを返す
   */
  const validateFiles = (files: File[]): File[] => {
    return files.filter(file => {
      // ファイルサイズのチェック (MB単位)
      const fileSizeMB = file.size / (1024 * 1024);
      if (fileSizeMB > MAX_FILE_SIZE_MB) {
        alert(`ファイル ${file.name} のサイズが大きすぎます (最大 ${MAX_FILE_SIZE_MB}MB)`);
        return false;
      }

      // サポートされているファイル形式かチェック
      const isSupported = Object.values(ACCEPTED_FILE_TYPES).some(
        types => types.includes(file.type)
      );
      
      if (!isSupported) {
        alert(`ファイル ${file.name} の形式はサポートされていません`);
        return false;
      }

      return true;
    });
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
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArray = Array.from(e.dataTransfer.files);
      const validFiles = validateFiles(filesArray);
      
      // 有効なファイルを現在の選択に追加
      const updatedFiles = [...selectedFiles, ...validFiles];
      setSelectedFiles(updatedFiles);
      onFilesSelected(updatedFiles);
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
      return <Film className="w-5 h-5" />;
    } else if (ACCEPTED_FILE_TYPES.audio.includes(fileType)) {
      return <Music className="w-5 h-5" />;
    }
    
    return <File className="w-5 h-5" />;
  };

  return (
    <div className="w-full">
      {/* ファイルアップロードエリア */}
      <div
        className={`border-2 border-dashed rounded-md p-4 text-center cursor-pointer ${
          dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
        }`}
        onClick={() => inputRef.current?.click()}
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
        />
        <Upload className="w-8 h-8 mx-auto text-gray-400" />
        <p className="mt-2 text-sm text-gray-600">
          クリックまたはファイルをドラッグ＆ドロップ
        </p>
        <p className="text-xs text-gray-500">
          画像、ドキュメント、音声、動画をサポート (最大 {MAX_FILE_SIZE_MB}MB)
        </p>
      </div>

      {/* 選択されたファイル一覧 */}
      {selectedFiles.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-medium mb-2">添付ファイル ({selectedFiles.length})</h4>
          <div className="space-y-2">
            {selectedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 bg-gray-50 rounded-md"
              >
                <div className="flex items-center space-x-2">
                  {getFileIcon(file)}
                  <span className="text-sm truncate max-w-[200px]">{file.name}</span>
                  <span className="text-xs text-gray-500">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB
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