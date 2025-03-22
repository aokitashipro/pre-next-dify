"use client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

import { useState, useEffect, useRef } from "react";

export default function Chat() {
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  
  // すでに表示されたテキストを追跡するための参照
  const displayedTextRef = useRef<string>("");
  const eventSourceRef = useRef<EventSource | null>(null);
  // 改行を検出するための一時バッファ
  const textBufferRef = useRef<string>("");
  // 受信した全テキストを保持するバッファ
  const completeTextRef = useRef<string>("");

  // テキストをメッセージに追加する共通関数（重複チェック付き）
  const appendText = (text: string) => {
    if (!text || !text.trim()) return;

    // チャンク全体をバッファに追加
    completeTextRef.current += text;
    // 完全なテキストとして表示
    setMessage(completeTextRef.current);
    
    // 参照用にテキストを保存
    displayedTextRef.current = completeTextRef.current;
  };

  // ストリーミングを開始する関数
  const startStreaming = () => {
    if (!query.trim()) {
      setError("クエリを入力してください");
      return;
    }

    setError(null);
    setIsLoading(true);
    setMessage("処理を開始しています...");
    displayedTextRef.current = ""; // 表示済みテキストをリセット
    textBufferRef.current = ""; // テキストバッファをリセット
    completeTextRef.current = ""; // 完全なテキストバッファをリセット
    
    // 既存のEventSourceがあれば閉じる
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    // URLにクエリパラメータを追加
    const url = `/api/workflow-stream?query=${encodeURIComponent(query)}&userId=user-${Date.now()}`;
    
    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const eventData = JSON.parse(event.data);
        
        // イベントタイプに基づいて処理
        switch (eventData.event) {
          case 'workflow_started':
            break;
            
          case 'node_started':
            break;
            
          case 'text_chunk':
            // text_chunkイベントを処理（APIドキュメントには明示的に記載されていないが、実際には送信される）
            // データ構造を詳しく検査
            
            // さまざまなプロパティをチェック
            let textChunk = '';
            if (eventData.answer) {
              textChunk = eventData.answer;
            } else if (eventData.text) {
              textChunk = eventData.text;
            } else if (eventData.content) {
              textChunk = eventData.content;
            } else if (eventData.data?.text) {
              textChunk = eventData.data.text;
            } else if (eventData.data?.answer) {
              textChunk = eventData.data.answer;
            } else if (eventData.data?.content) {
              textChunk = eventData.data.content;
            }
            
            if (textChunk) {
              appendText(textChunk);
            } 
            break;
            
          case 'node_finished':
            
            // ノード出力がある場合は表示（一部のノードでは出力が含まれる場合がある）
            // 「llm」ノードの場合のみテキストを表示し、その他のノード（endなど）は無視
            if (eventData.data?.node_type === 'llm' && eventData.data?.outputs) {
              const outputs = eventData.data.outputs;
              
              let outputText = '';
              if (typeof outputs === 'string') {
                outputText = outputs;
              } else if (outputs.text && typeof outputs.text === 'string') {
                outputText = outputs.text;
              } else if (outputs.answer && typeof outputs.answer === 'string') {
                outputText = outputs.answer;
              } else if (outputs.content && typeof outputs.content === 'string') {
                outputText = outputs.content;
              } else if (outputs.output && typeof outputs.output === 'string') {
                outputText = outputs.output;
              }
              
              // 完全なテキストが受信されていない場合は、最終出力を表示
              if (completeTextRef.current === "" || completeTextRef.current === "処理を開始しています...") {
                completeTextRef.current = outputText;
                setMessage(outputText);
                displayedTextRef.current = outputText;
              }
            }
            break;
            
          case 'workflow_finished':
            setIsLoading(false);
            eventSource.close();
            
            // 最終的なテキスト確認（出力がない場合に備えて）
            if (eventData.data?.outputs) {
              let finalOutput = '';
              const outputs = eventData.data.outputs;
              
              if (typeof outputs === 'string') {
                finalOutput = outputs;
              } else if (outputs.text && typeof outputs.text === 'string') {
                finalOutput = outputs.text;
              } else if (outputs.answer && typeof outputs.answer === 'string') {
                finalOutput = outputs.answer;
              } else if (outputs.content && typeof outputs.content === 'string') {
                finalOutput = outputs.content;
              } else if (outputs.output && typeof outputs.output === 'string') {
                finalOutput = outputs.output;
              }
              
              // 完全なテキストが空または初期値の場合のみ更新
              if (!completeTextRef.current || completeTextRef.current === "処理を開始しています...") {
                completeTextRef.current = finalOutput;
                setMessage(finalOutput);
              }
            }
            break;
            
          case 'message':
            // message イベント（チャット系APIと互換性を持たせる）
            const messageText = eventData.answer || eventData.text || '';
            if (messageText) {
              appendText(messageText);
            }
            break;
                        
          default:
            // その他の未知のイベント
            // 未知のイベントでもテキストデータがあれば表示（互換性のため）
            if (eventData.answer || eventData.text) {
              const text = eventData.answer || eventData.text;
              
              appendText(text);
            }
        }
      } catch (err) {
        console.error('データ解析エラー:', err, event.data);
      }
    };

    eventSource.onerror = (error) => {
      console.error("SSE エラー:", error);
      setError("ストリーミング接続中にエラーが発生しました。");
      setIsLoading(false);
      eventSource.close();
    };

  };

  // コンポーネントのアンマウント時にEventSourceを閉じる
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Dify workflow API</CardTitle>
        <CardDescription>
          ストリーミングテスト
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* 入力エリア */}
        <Textarea
          placeholder="質問を入力してください"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          rows={4}
          className="w-full resize-none text-base md:text-base"
          disabled={isLoading}
        />
        
        {/* 出力エリア */}
        {error && <p className="text-red-500">{error}</p>}

        {message && (
          <div className="p-4 bg-gray-100 rounded-md">
            <h3 className="text-sm font-medium mb-2">回答:</h3>
            <p className="whitespace-pre-wrap">{message}</p>
          </div>
        )}
      </CardContent>
      
      <CardFooter>
        <Button 
          onClick={startStreaming} 
          className="w-full" 
          disabled={isLoading}
        >
          {isLoading ? (
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
