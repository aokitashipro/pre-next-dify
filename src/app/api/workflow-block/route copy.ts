// app/api/dify/route.ts - 最終版
import { NextRequest, NextResponse } from 'next/server';

// 環境変数の設定
const DIFY_API_URL = process.env.DIFY_API_URL;
const DIFY_API_KEY = process.env.DIFY_API_WORKFLOW_KEY;

export async function POST(request: NextRequest) {
  try {
    // リクエストボディを取得
    const body = await request.json();
    const { query, userId } = body;
    
    // 入力チェック
    if (!query || !userId) {
      return NextResponse.json(
        { error: '入力フィールドとユーザーIDは必須です' },
        { status: 400 }
      );
    }
    
    // 必須設定のチェック
    if (!DIFY_API_KEY) {
      return NextResponse.json(
        { error: 'DIFY API KEYが設定されていません' },
        { status: 500 }
      );
    }
    
    // エンドポイントの決定
    const endpoint = `${DIFY_API_URL}/workflows/run`;
    
    // Dify ワークフローAPIを呼び出す
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DIFY_API_KEY}`,
      },
      body: JSON.stringify({
        inputs: {
          query: query  // Dify側の開始ブロックのフィールド名と一致させる
        },
        response_mode: 'blocking', // ブロッキングモード
        user: userId,
      }),
    });
    
    // エラー処理
    if (!response.ok) {
      const errorText = await response.text();
      let errorDetails;
      
      try {
        errorDetails = JSON.parse(errorText);
      } catch {
        errorDetails = { raw: errorText };
      }
      
      return NextResponse.json(
        { 
          error: `Dify API error: ${response.status}`,
          details: errorDetails
        },
        { status: response.status }
      );
    }
    
    // 成功レスポンスの処理
    const data = await response.json();
    
    // Difyワークフローの出力変数を取得
    const outputText = data.data?.outputs?.output || 'No output found';
    
    return NextResponse.json({
      result: outputText,
      status: data.data?.status || 'unknown'
    });
    
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}