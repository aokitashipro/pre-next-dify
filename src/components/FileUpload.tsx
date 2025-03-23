'use client';
import { useState, useRef } from 'react';
import { Upload, X, File, Image, FileText, Film, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';

// サポートされるファイル種別とMIMEタイプのマッピング
const ACCEPTED_FILE_TYPES = {
  'image': ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  'document': ['application/pdf', 'text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 
              'application/vnd.openxmlformats-officedocument.presentationml.presentation',
              'text/csv'],
  'audio': ['audio/mpeg', 'audio/wav', 'audio/ogg'],
  'video': ['video/mp4', 'video/webm', 'video/ogg']
};

// 最大ファイルサイズ (MB)
const MAX_FILE_SIZE = 10;

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void;
  selectedFiles: File[];
  setSelectedFiles: (files: File[]) => void;
}

export default function FileUpload({ onFilesSelected, selectedFiles, setSelectedFiles }: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      const validFiles = validateFiles(filesArray);
      setSelectedFiles([...selectedFiles, ...validFiles]);
      onFilesSelected([...selectedFiles, ...validFiles]);
    }
  };

  const validateFiles = (files: File[]): File[] => {
    return files.filter(file => {
      // ファイルサイズのチェック (MB単位)
      const fileSizeMB = file.size / (1024 * 1024);
      if (fileSizeMB > MAX_FILE_SIZE) {
        alert(`ファイル ${file.name} のサイズが大きすぎます (最大 ${MAX_FILE_SIZE}MB)`);
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

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArray = Array.from(e.dataTransfer.files);
      const validFiles = validateFiles(filesArray);
      setSelectedFiles([...selectedFiles, ...validFiles]);
      onFilesSelected([...selectedFiles, ...validFiles]);
    }
  };

  const removeFile = (index: number) => {
    const newFiles = [...selectedFiles];
    newFiles.splice(index, 1);
    setSelectedFiles(newFiles);
    onFilesSelected(newFiles);
  };

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
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          onChange={handleFileChange}
          className="hidden"
          accept={Object.values(ACCEPTED_FILE_TYPES).flat().join(',')}
        />
        <Upload className="w-8 h-8 mx-auto text-gray-400" />
        <p className="mt-2 text-sm text-gray-600">
          クリックまたはファイルをドラッグ＆ドロップ
        </p>
        <p className="text-xs text-gray-500">
          画像、ドキュメント、音声、動画をサポート (最大 {MAX_FILE_SIZE}MB)
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