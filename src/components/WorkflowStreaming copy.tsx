"use client";

import { useState, useEffect, useRef } from "react";

export default function Chat() {
  const [message, setMessage] = useState("処理を開始しています...");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  
  // すでに表示されたテキストを追跡するための参照
  const displayedTextRef = useRef<string>("");
  const eventSourceRef = useRef<EventSource | null>(null);
  // 改行を検出するための一時バッファ
  const textBufferRef = useRef<string>("");
  // 受信した全テキストを保持するバッファ
  const completeTextRef = useRef<string>("");

  // デバッグ情報を追加する関数
  const addDebugInfo = (info: string) => {
    setDebugInfo(prev => [...prev, `[${new Date().toISOString()}] ${info}`]);
  };

  // テキストをメッセージに追加する共通関数（重複チェック付き）
  const appendText = (text: string, eventType: string) => {
    if (!text || !text.trim()) return;

    // チャンク全体をバッファに追加
    completeTextRef.current += text;
    
    addDebugInfo(`${eventType}: テキスト追加: ${text.substring(0, 20)}...`);
    
    // 完全なテキストとして表示
    setMessage(completeTextRef.current);
    
    // 参照用にテキストを保存
    displayedTextRef.current = completeTextRef.current;
  };
  
  // 改行コードを検出して処理する関数
  const processNewlines = (text: string) => {
    // 改行を含む場合に特別な処理を行う
    if (text.includes('\n')) {
      addDebugInfo('改行コードを検出しました');
    }
    return text;
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
    setDebugInfo([]); // デバッグ情報をクリア
    displayedTextRef.current = ""; // 表示済みテキストをリセット
    textBufferRef.current = ""; // テキストバッファをリセット
    completeTextRef.current = ""; // 完全なテキストバッファをリセット
    
    // 既存のEventSourceがあれば閉じる
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    // URLにクエリパラメータを追加
    const url = `/api/workflow-stream?query=${encodeURIComponent(query)}&userId=user-${Date.now()}`;
    addDebugInfo(`ストリーミング開始: ${url}`);
    
    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        // 受信データを完全に表示
        addDebugInfo(`受信データ: ${event.data}`);
        const eventData = JSON.parse(event.data);
        
        // イベントタイプに基づいて処理
        switch (eventData.event) {
          case 'workflow_started':
            addDebugInfo(`ワークフロー開始: ${eventData.workflow_run_id}`);
            break;
            
          case 'node_started':
            addDebugInfo(`ノード開始: ${eventData.data?.node_type || 'Unknown node'}`);
            break;
            
          case 'text_chunk':
            // text_chunkイベントを処理（APIドキュメントには明示的に記載されていないが、実際には送信される）
            // データ構造を詳しく検査
            addDebugInfo(`text_chunk イベント完全データ: ${JSON.stringify(eventData)}`);
            
            // さまざまなプロパティをチェック
            let textChunk = '';
            if (eventData.answer) {
              textChunk = eventData.answer;
              addDebugInfo(`text_chunk answer: ${textChunk.substring(0, 20)}...`);
            } else if (eventData.text) {
              textChunk = eventData.text;
              addDebugInfo(`text_chunk text: ${textChunk.substring(0, 20)}...`);
            } else if (eventData.content) {
              textChunk = eventData.content;
              addDebugInfo(`text_chunk content: ${textChunk.substring(0, 20)}...`);
            } else if (eventData.data?.text) {
              textChunk = eventData.data.text;
              addDebugInfo(`text_chunk data.text: ${textChunk.substring(0, 20)}...`);
            } else if (eventData.data?.answer) {
              textChunk = eventData.data.answer;
              addDebugInfo(`text_chunk data.answer: ${textChunk.substring(0, 20)}...`);
            } else if (eventData.data?.content) {
              textChunk = eventData.data.content;
              addDebugInfo(`text_chunk data.content: ${textChunk.substring(0, 20)}...`);
            }
            
            if (textChunk) {
              // 改行コードを処理
              textChunk = processNewlines(textChunk);
              appendText(textChunk, 'text_chunk');
            } else {
              addDebugInfo(`text_chunk: テキストデータが見つかりません`);
            }
            break;
            
          case 'node_finished':
            addDebugInfo(`ノード終了: ${eventData.data?.node_type || 'Unknown node'}, 状態: ${eventData.data?.status || 'Unknown'}`);
            
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
                addDebugInfo(`LLMノード完全出力を表示: ${outputText.substring(0, 30)}...`);
                outputText = processNewlines(outputText);
                completeTextRef.current = outputText;
                setMessage(outputText);
                displayedTextRef.current = outputText;
              }
            }
            break;
            
          case 'workflow_finished':
            addDebugInfo(`ワークフロー終了: ${eventData.data?.status || 'Unknown'}`);
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
                addDebugInfo(`ワークフロー終了時の完全な出力を表示: ${finalOutput.substring(0, 30)}...`);
                completeTextRef.current = finalOutput;
                setMessage(finalOutput);
              }
            }
            break;
            
          case 'message':
            // message イベント（チャット系APIと互換性を持たせる）
            const messageText = eventData.answer || eventData.text || '';
            if (messageText) {
              addDebugInfo(`メッセージ: ${messageText.substring(0, 20)}...`);
              appendText(processNewlines(messageText), 'message');
            }
            break;
            
          case 'tts_message':
            // 音声合成出力（このアプリケーションでは処理しない）
            addDebugInfo('TTS メッセージ受信');
            break;
            
          case 'tts_message_end':
            // 音声合成終了（このアプリケーションでは処理しない）
            addDebugInfo('TTS メッセージ終了');
            break;
            
          case 'ping':
            // ping イベントは無視（接続維持用）
            addDebugInfo('Ping イベント受信');
            break;
            
          default:
            // その他の未知のイベント
            addDebugInfo(`不明なイベント: ${eventData.event}`);
            // 未知のイベントでもテキストデータがあれば表示（互換性のため）
            if (eventData.answer || eventData.text) {
              const text = eventData.answer || eventData.text;
              addDebugInfo(`未知のイベントからのテキスト: ${text.substring(0, 20)}...`);
              appendText(processNewlines(text), 'unknown');
            }
        }
      } catch (err) {
        addDebugInfo(`データ解析エラー: ${err}`);
        console.error('データ解析エラー:', err, event.data);
      }
    };

    eventSource.onerror = (error) => {
      addDebugInfo(`SSE エラー: ${JSON.stringify(error)}`);
      console.error("SSE エラー:", error);
      setError("ストリーミング接続中にエラーが発生しました。");
      setIsLoading(false);
      eventSource.close();
    };

    eventSource.addEventListener('open', () => {
      addDebugInfo('SSE 接続が確立されました');
    });
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
    <div className="p-4 border rounded-lg max-w-lg">
      <h2 className="text-lg font-bold">AI Chat</h2>
      
      <div className="my-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="質問を入力してください"
          className="w-full p-2 border rounded text-base md:text-base"
          disabled={isLoading}
        />
        <button
          onClick={startStreaming}
          disabled={isLoading}
          className="mt-2 p-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
        >
          {isLoading ? "処理中..." : "送信"}
        </button>
      </div>
      
      {error && <p className="text-red-500">{error}</p>}
      
      <div className="mt-4 p-4 border rounded min-h-[200px] whitespace-pre-wrap overflow-auto break-words">
        {message}
      </div>
      
      {debugInfo.length > 0 && (
        <div className="mt-4">
          <details>
            <summary className="cursor-pointer font-bold">デバッグ情報</summary>
            <div className="mt-2 p-2 bg-gray-100 rounded text-xs max-h-[200px] overflow-y-auto">
              {debugInfo.map((info, i) => (
                <div key={i}>{info}</div>
              ))}
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
