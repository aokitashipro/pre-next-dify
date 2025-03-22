'use client'
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";

// Difyのレスポンス構造を確認するためのデバッグコンポーネント
export default function DebugResponseComponent() {
  const [input, setInput] = useState('');
  const [rawResponse, setRawResponse] = useState(null);
  const [loading, setLoading] = useState(false);

  // APIを呼び出してレスポンスの生データを取得
  const callDebugApi = async () => {
    if (!input.trim()) return;
    
    setLoading(true);
    setRawResponse(null);
    
    try {
      const response = await fetch('/api/dify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          query: input,
          userId: 'debug-' + Date.now()
        }),
      });
      
      const data = await response.json();
      setRawResponse(data);
    } catch (error) {
      console.error('Debug API call failed:', error);
      setRawResponse({ error: 'APIコール失敗' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <Card className="p-4 space-y-4">
        <h2 className="text-xl font-bold">Dify APIレスポンスデバッグ</h2>
        
        {/* 入力エリア */}
        <div>
          <Textarea
            placeholder="テストクエリを入力..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={3}
            className="w-full resize-none"
            disabled={loading}
          />
        </div>
        
        {/* 送信ボタン */}
        <Button 
          onClick={callDebugApi} 
          className="w-full" 
          disabled={loading || !input.trim()}
        >
          {loading ? 'デバッグ中...' : 'レスポンス構造を確認'}
        </Button>
        
        {/* レスポンス表示エリア */}
        {rawResponse && (
          <div className="mt-4 p-4 bg-gray-100 rounded-md overflow-auto max-h-96">
            <h3 className="font-medium mb-2">生レスポンス:</h3>
            <pre className="text-xs whitespace-pre-wrap break-all">
              {JSON.stringify(rawResponse, null, 2)}
            </pre>
          </div>
        )}
      </Card>
    </div>
  );
}