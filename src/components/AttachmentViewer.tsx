'use client';
import { useState, useMemo, memo, useCallback } from 'react';
import { FileAttachment } from '@/store/chatStore';
import { Download } from 'lucide-react';
import ImageNext from 'next/image';

/**
 * 添付ファイルの表示に関する型定義
 */
interface AttachmentViewerProps {
  attachments: FileAttachment[];
}

/**
 * 単一の添付ファイルアイテムを表示するコンポーネント
 */
const AttachmentItem = memo(function AttachmentItem({ 
  attachment, 
  index
}: { 
  attachment: FileAttachment; 
  index: number;
}) {
  // 添付ファイルの展開/折りたたみ状態
  const [expanded, setExpanded] = useState(false);
  
  // ファイルの拡張子を取得
  const fileExt = useMemo(() => {
    const parts = attachment.fileName.split('.');
    return parts.length > 1 ? parts.pop()?.toLowerCase() : '';
  }, [attachment.fileName]);
  
  // 画像ファイルかどうかを判定
  const isImage = useMemo(() => {
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'];
    return imageExtensions.includes(fileExt || '');
  }, [fileExt]);

  // 展開/折りたたみを切り替える
  const toggleExpand = useCallback(() => {
    setExpanded(prev => !prev);
  }, []);

  // ファイルをダウンロード
  const handleDownload = useCallback((e: React.MouseEvent) => {
    e.stopPropagation(); // クリックイベントの伝播を停止
    if (attachment.fileUrl) {
      window.open(attachment.fileUrl, '_blank');
    }
  }, [attachment.fileUrl]);

  // デバッグ用ログ出力
  console.log(`AttachmentItem[${index}]: レンダリング`, {
    fileName: attachment.fileName,
    fileUrl: attachment.fileUrl,
    fileId: attachment.fileId,
    isImage
  });

  return (
    <div className="flex flex-col border rounded p-2 mb-2 bg-gray-50">
      {/* ファイル情報ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center cursor-pointer" onClick={toggleExpand}>
          <div className="mr-2 text-blue-500">
            {isImage ? '🖼️' : '📄'}
          </div>
          <div className="text-sm text-gray-700 truncate">
            {attachment.fileName}
          </div>
        </div>
        
        {/* ファイルURLがある場合はダウンロードボタンを表示 */}
        {attachment.fileUrl && (
          <button
            onClick={handleDownload}
            className="text-xs text-blue-600 hover:text-blue-800 ml-2"
            aria-label="ダウンロード"
          >
            ダウンロード
          </button>
        )}
      </div>
      
      {/* 画像プレビュー - 展開時のみ表示 */}
      {isImage && expanded && attachment.fileUrl && (
        <div className="mt-2 border rounded overflow-hidden">
          <div className="relative w-full h-40">
            <ImageNext
              src={attachment.fileUrl}
              alt={attachment.fileName}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              style={{ objectFit: 'contain' }}
            />
          </div>
        </div>
      )}
    </div>
  );
});

/**
 * 複数の添付ファイルを表示するコンポーネント
 */
const AttachmentViewer = memo(function AttachmentViewer({ attachments }: AttachmentViewerProps) {
  // 添付ファイルがない場合は何も表示しない
  if (!attachments || attachments.length === 0) {
    return null;
  }

  console.log(`AttachmentViewer: ${attachments.length}件の添付ファイルをレンダリング`);
  
  // 添付ファイルのキャッシュキー生成（デバッグ用）
  const attachmentKey = attachments.map(a => a.fileId || a.fileName).join('-');
  console.log(`AttachmentViewer Key: ${attachmentKey.substring(0, 20)}...`);
  
  return (
    <div className="mt-2">
      <div className="text-xs font-medium text-gray-500 mb-1">添付ファイル ({attachments.length})</div>
      {attachments.map((attachment, index) => (
        <AttachmentItem 
          key={attachment.fileId || `file-${index}-${attachment.fileName}`}
          attachment={attachment} 
          index={index}
        />
      ))}
    </div>
  );
});

export default AttachmentViewer; 