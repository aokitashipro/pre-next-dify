'use client';
import { useState, useMemo, memo, useCallback } from 'react';
import { FileAttachment } from '@/store/chatStore';
import { File, Image, FileText, Film, Music, Download, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ImageNext from 'next/image';

interface AttachmentViewerProps {
  attachments: FileAttachment[] | undefined;
}

// 個別の添付ファイルアイテムコンポーネント
const AttachmentItem = memo(function AttachmentItemBase({ 
  attachment, 
  index
}: { 
  attachment: FileAttachment; 
  index: number;
}) {
  const [expanded, setExpanded] = useState(false);
  
  // ファイルの拡張子を取得
  const fileExt = useMemo(() => {
    const parts = attachment.fileName.split('.');
    return parts.length > 1 ? parts.pop()?.toLowerCase() : '';
  }, [attachment.fileName]);
  
  // 画像ファイルかどうかを判定
  const isImage = useMemo(() => {
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(fileExt || '');
  }, [fileExt]);

  // サムネイル表示を切り替える
  const toggleExpand = useCallback(() => {
    setExpanded(prev => !prev);
  }, []);

  // ファイルをダウンロードする
  const handleDownload = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (attachment.fileUrl) {
      window.open(attachment.fileUrl, '_blank');
    }
  }, [attachment.fileUrl]);

  console.log(`AttachmentItem[${index}]: レンダリング`, {
    fileName: attachment.fileName,
    fileUrl: attachment.fileUrl,
    fileId: attachment.fileId,
    isImage
  });

  return (
    <div className="flex flex-col border rounded p-2 mb-2 bg-gray-50">
      <div className="flex items-center justify-between">
        <div className="flex items-center cursor-pointer" onClick={toggleExpand}>
          <div className="mr-2 text-blue-500">
            {isImage ? '🖼️' : '📄'}
          </div>
          <div className="text-sm text-gray-700 truncate">
            {attachment.fileName}
          </div>
        </div>
        
        {attachment.fileUrl && (
          <button
            onClick={handleDownload}
            className="text-xs text-blue-600 hover:text-blue-800 ml-2"
          >
            ダウンロード
          </button>
        )}
      </div>
      
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
}, (prevProps, nextProps) => {
  // 添付ファイルの内容に変更がない場合は再レンダリングしない
  return (
    prevProps.attachment.fileId === nextProps.attachment.fileId &&
    prevProps.attachment.fileUrl === nextProps.attachment.fileUrl &&
    prevProps.attachment.fileName === nextProps.attachment.fileName
  );
});

// AttachmentViewerコンポーネント
const AttachmentViewer: React.FC<{ attachments: FileAttachment[] }> = memo(({ attachments }) => {
  console.log(`AttachmentViewer: ${attachments.length}件の添付ファイルをレンダリング`);
  
  // 添付ファイルのIDを結合した一意のキーを生成（デバッグ用）
  const attachmentKey = useMemo(() => {
    return attachments.map(a => a.fileId || a.fileName).join('-');
  }, [attachments]);
  
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
}, (prevProps, nextProps) => {
  // 添付ファイルの数が同じで、すべてのファイルIDとURLが同じ場合は再レンダリングしない
  if (prevProps.attachments.length !== nextProps.attachments.length) {
    return false;
  }
  
  for (let i = 0; i < prevProps.attachments.length; i++) {
    const prev = prevProps.attachments[i];
    const next = nextProps.attachments[i];
    
    if (prev.fileId !== next.fileId ||
        prev.fileUrl !== next.fileUrl ||
        prev.fileName !== next.fileName) {
      return false;
    }
  }
  
  return true;
});

export default AttachmentViewer; 