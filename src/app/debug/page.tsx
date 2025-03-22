'use client'
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function DebugPage() {
  const [apiKey, setApiKey] = useState('');
  const [response, setResponse] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testBlocking = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const res = await fetch('/api/dify/workflow-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mode: 'blocking',
          apiKey: apiKey || undefined
        }),
      });
      
      const data = await res.json();
      setResponse(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen p-4 bg-gray-50">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-center mb-6">Dify API デバッグ</h1>
        
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>API 設定</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="text-sm mb-1 block">API キー (オプション)</label>
                <Input
                  type="text"
                  placeholder="デフォルトは環境変数を使用"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-1">
                  空の場合、サーバー側の環境変数を使用します
                </p>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button 
              onClick={testBlocking} 
              disabled={isLoading}
            >
              ブロッキングモードでテスト
            </Button>
          </CardFooter>
        </Card>
        
        {error && (
          <Card className="mb-6 border-red-500">
            <CardHeader>
              <CardTitle className="text-red-500">エラー</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-red-50 p-4 rounded overflow-auto text-sm">
                {error}
              </pre>
            </CardContent>
          </Card>
        )}
        
        {response && (
          <Card>
            <CardHeader>
              <CardTitle>レスポンス</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-gray-50 p-4 rounded overflow-auto text-sm">
                {JSON.stringify(response, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}