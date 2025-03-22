// src/components/ResourceViewer.tsx
'use client';
import React, { useEffect, useRef, memo, useState } from 'react';
import { ResourceInfo } from '@/store/chatStore';
import { FileText } from 'lucide-react';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ResourceViewerProps {
  resources: ResourceInfo[];
}

// メモ化したコンポーネント
const ResourceViewer = memo(({ resources }: ResourceViewerProps) => {
  // 選択されたリソースのインデックス
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  // ダイアログの開閉状態
  const [dialogOpen, setDialogOpen] = useState(false);
  // 前回のリソースIDリスト
  const previousResourcesRef = useRef<string[]>([]);
  
  // リソースが変わったかどうかだけをチェック
  useEffect(() => {
    if (!resources) return;
    
    // リソースごとのユニークなIDを生成
    const currentResourceIds = resources.map(r => 
      `${r.document_name}-${r.segment_position}-${r.score}`
    );
    
    // 前回と今回のリソースが異なる場合のみログ出力
    const prevIds = previousResourcesRef.current;
    const isEqual = 
      prevIds.length === currentResourceIds.length && 
      prevIds.every((id, i) => id === currentResourceIds[i]);
    
    if (!isEqual) {
      console.log('ResourceViewer - リソースが更新されました');
      console.log('ResourceViewer - リソース数:', resources.length);
      // 現在のリソースIDを保存
      previousResourcesRef.current = currentResourceIds;
    }
  }, [resources]);
  
  // リソースが選択されたときの処理
  const handleResourceClick = (index: number) => {
    setSelectedIndex(index);
    setDialogOpen(true);
  };
  
  return (
    <div style={{ 
      border: '2px solid #e2e8f0', 
      borderRadius: '8px',
      padding: '16px',
      margin: '16px 0',
      backgroundColor: '#f8fafc'
    }}>
      <h2 style={{ 
        color: '#334155', 
        marginBottom: '12px',
        fontWeight: 'bold',
        fontSize: '1.25rem'
      }}>
        参照資料（{resources.length}件）
      </h2>
      
      <div style={{ 
        display: 'flex', 
        flexWrap: 'wrap', 
        gap: '8px'
      }}>
        {resources.map((resource, index) => (
          <div
            key={`${resource.document_name}-${resource.segment_position}-${index}`}
            onClick={() => handleResourceClick(index)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 10px',
              backgroundColor: '#e2e8f0',
              borderRadius: '16px',
              cursor: 'pointer',
              fontSize: '0.875rem',
              color: '#334155',
              fontWeight: '500',
              transition: 'background-color 0.2s',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#cbd5e1';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = '#e2e8f0';
            }}
          >
            <FileText size={16} color="#3b82f6" />
            <span>{resource.document_name} #{resource.segment_position}</span>
            <span style={{
              backgroundColor: '#dbeafe',
              color: '#2563eb',
              padding: '2px 6px',
              borderRadius: '8px',
              fontSize: '0.75rem',
            }}>
              {Math.round(resource.score * 100)}%
            </span>
          </div>
        ))}
      </div>
      
      {/* ダイアログ */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        {selectedIndex !== null && (
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-600" />
                {resources[selectedIndex].document_name}
              </DialogTitle>
              <DialogDescription>
                セグメント #{resources[selectedIndex].segment_position}
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="h-[400px] w-full rounded-md border p-4">
              <pre className="whitespace-pre-wrap text-sm">
                {resources[selectedIndex].content}
              </pre>
            </ScrollArea>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="secondary" type="button">
                  閉じる
                </Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
});

// displayNameを設定
ResourceViewer.displayName = 'ResourceViewer';

export default ResourceViewer;