'use client'
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

// シンプルなDify連携コンポーネント（最終版）
export default function WorkflowBlocking() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);

  // Dify APIを呼び出す関数
  const callDifyApi = async () => {
    if (!input.trim()) return;
    
    setLoading(true);
    setOutput('');
    
    try {
      const response = await fetch('/api/workflow-block', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          query: input,
          userId: 'user-' + Date.now() // シンプルな一意のID
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setOutput(data.result);
      } else {
        setOutput(`Error: ${data.error || '不明なエラー'}`);
      }
    } catch (error) {
      console.error('API call failed:', error);
      setOutput('エラーが発生しました。もう一度お試しください。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Dify workflow API</CardTitle>
        <CardDescription>
          シンプルなワークフロー
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* 入力エリア */}
        <Textarea
          placeholder="質問を入力してください"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={4}
          className="w-full resize-none text-base md:text-base"
          disabled={loading}
        />
        
        {/* 出力エリア */}
        {output && (
          <div className="p-4 bg-gray-100 rounded-md">
            <h3 className="text-sm font-medium mb-2">回答:</h3>
            <p className="whitespace-pre-wrap">{output}</p>
          </div>
        )}
      </CardContent>
      
      <CardFooter>
        <Button 
          onClick={callDifyApi} 
          className="w-full" 
          disabled={loading || !input.trim()}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              処理中...
            </>
          ) : (
            '送信'
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}