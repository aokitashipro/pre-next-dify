// src/components/ResourceViewer.tsx
'use client';
import React, { useEffect, useRef, memo } from 'react';
import { ResourceInfo } from '@/store/chatStore';

interface ResourceViewerProps {
  resources: ResourceInfo[];
}

// メモ化したコンポーネント
const ResourceViewer = memo(({ resources }: ResourceViewerProps) => {
  // レンダリング回数を追跡
  const renderCount = useRef(0);
  
  // 初回レンダリング時とpropsが変わるたびにログを出力
  useEffect(() => {
    console.log('ResourceViewer - マウントされました');
    console.log('ResourceViewer - リソース数:', resources?.length);
    
    return () => {
      console.log('ResourceViewer - アンマウントされました');
    };
  }, [resources]);
  
  // レンダリングをカウント
  renderCount.current++;
  
  // スタイリングなしのプレーンなHTML
  return (
    <div style={{ 
      border: '3px solid red', 
      borderRadius: '8px',
      padding: '16px',
      margin: '16px 0',
      backgroundColor: '#fffeee'
    }}>
      <h2 style={{ color: 'red', marginBottom: '12px' }}>
        リソース表示（レンダリング回数: {renderCount.current}）
      </h2>
      <div>リソース数: {resources.length}</div>
      <ul style={{ listStyle: 'disc', paddingLeft: '20px' }}>
        {resources.map((resource, index) => (
          <li key={index} style={{ marginBottom: '8px' }}>
            <strong>{resource.document_name}</strong> 
            (セグメント: {resource.segment_position}, 
            スコア: {Math.round(resource.score * 100)}%)
          </li>
        ))}
      </ul>
    </div>
  );
});

// displayNameを設定
ResourceViewer.displayName = 'ResourceViewer';

export default ResourceViewer;