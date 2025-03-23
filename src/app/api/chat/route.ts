import { NextRequest, NextResponse } from 'next/server';
import { createConversationAndMessages } from '@/lib/createConversation';
import { writeFile, mkdir, readFile } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { existsSync } from 'fs';
import { FormData, File as FormDataFile } from 'formdata-node';
import { fileFromPath } from 'formdata-node/file-from-path';

// アップロードファイルを保存するディレクトリ
const UPLOAD_DIR = join(process.cwd(), 'public', 'uploads');

// Dify APIにファイルをアップロードする関数
async function uploadFileToDify(file: File, userId: string): Promise<string | null> {
  try {
    // 1. ファイルを一時的にディスクに保存
    const tempFileName = `${uuidv4()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const tempFilePath = join(UPLOAD_DIR, tempFileName);
    
    const fileBuffer = await file.arrayBuffer();
    await writeFile(tempFilePath, Buffer.from(fileBuffer));
    
    console.log(`Saved file temporarily to ${tempFilePath} for Dify upload`);
    
    // 2. formdata-nodeのFormDataを使用してAPIリクエストを構築
    const formData = new FormData();
    
    // fileFromPathを使用してファイルを追加
    const fileObject = await fileFromPath(tempFilePath, file.name, {
      type: file.type
    });
    
    formData.set('file', fileObject);
    formData.set('user', userId);
    
    console.log(`Uploading file to Dify: ${file.name}, size: ${file.size}, type: ${file.type}`);
    
    // 3. APIリクエストを送信
    const response = await fetch(`${process.env.DIFY_API_URL}/files/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.DIFY_API_KEY}`
      },
      // @ts-ignore - formData型の互換性エラーを無視
      body: formData
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Dify File Upload Error:', {
        status: response.status,
        body: errorText,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size
      });
      return null;
    }
    
    const data = await response.json();
    console.log(`Successfully uploaded file to Dify, got ID: ${data.id}`);
    return data.id; // アップロードされたファイルのID
  } catch (error) {
    console.error('File upload to Dify failed:', error);
    return null;
  }
}

// 保存したファイルの情報を返す関数
async function saveFile(file: File): Promise<{ 
  fileId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  fileUrl: string;
}> {
  // uuid生成
  const fileId = uuidv4();
  
  // 元のファイル名から拡張子を抽出
  const originalName = file.name;
  const extension = originalName.split('.').pop();
  
  // ファイル名に拡張子を含めた保存名を作成
  const fileName = `${fileId}.${extension}`;
  const filePath = join(UPLOAD_DIR, fileName);
  
  // ディレクトリが存在しない場合は作成
  if (!existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true });
  }
  
  // ファイルをバイナリとして読み込む
  const fileBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(fileBuffer);
  
  // ファイルを保存
  await writeFile(filePath, buffer);
  
  // ファイル情報を返す
  return {
    fileId,
    fileName: originalName,
    fileType: file.type,
    fileSize: file.size,
    fileUrl: `/uploads/${fileName}`
  };
}

export async function POST(request: NextRequest) {
  try {
    // FormDataとして処理
    const formData = await request.formData();
    
    const query = formData.get('query') as string || '';
    const conversation_id = formData.get('conversation_id') as string || undefined;
    const userId = formData.get('user') as string;
    
    // ファイルを取得
    const files: File[] = [];
    const filesFormData = formData.getAll('files');
    console.log(`Received ${filesFormData.length} files in form data`);
    
    for (const file of filesFormData) {
      if (file instanceof File) {
        console.log(`Processing file: ${file.name}, size: ${file.size}, type: ${file.type}`);
        files.push(file);
      } else if (typeof file === 'string') {
        console.log(`Received file ID: ${file}`);
        // ファイルIDの場合はスキップ（今後の拡張のために記録のみ）
      } else {
        console.warn('Non-file object found in files field:', typeof file, file);
      }
    }
    
    // 入力バリデーション（ファイルがある場合は空のクエリも許可）
    if (!query && files.length === 0) {
      return NextResponse.json(({ error: 'Query or files are required' }),{ status: 400 });
    }

    // API設定チェック
    if (!process.env.DIFY_API_KEY) {
      console.error('DIFY_API_KEY is not configured');
      return NextResponse.json({ error: 'API configuration error' },{ status: 500 });
    }

    // ファイルを保存し、添付ファイル情報を作成
    const attachments = [];
    
    // Dify APIに送信するファイル配列
    const difyFiles = [];
    
    if (files.length > 0) {
      console.log(`Processing ${files.length} files for upload`);
      
      // 各ファイルを順番に処理
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          console.log(`Processing file ${i+1}/${files.length}: ${file.name}`);
          
          // 1. ローカルにファイルを保存
          const fileInfo = await saveFile(file);
          attachments.push(fileInfo);
          
          // 2. Dify APIにファイルをアップロード
          const uploadFileId = await uploadFileToDify(file, userId);
          
          if (uploadFileId) {
            // ファイルタイプを適切に判定
            let fileType = 'file'; // デフォルト値
            
            if (file.type.startsWith('image/')) {
              fileType = 'image';
            } else if (file.type.startsWith('audio/')) {
              fileType = 'audio';
            } else if (file.type.startsWith('video/')) {
              fileType = 'video';
            } else if (file.type === 'application/pdf' || 
                      file.type.includes('document') || 
                      file.type.includes('spreadsheet') || 
                      file.type.includes('presentation') || 
                      file.type.startsWith('text/')) {
              fileType = 'document';
            }
            
            // Dify APIリクエスト用ファイル情報を追加
            difyFiles.push({
              type: fileType,
              transfer_method: "local_file", // local_fileを使用
              upload_file_id: uploadFileId // アップロードしたファイルのID
            });
            
            console.log(`Added file to difyFiles array with ID: ${uploadFileId}, type: ${fileType}`);
          } else {
            console.error(`Failed to upload file ${file.name} to Dify API`);
          }
        } catch (fileError) {
          console.error(`Error processing file ${file.name}:`, fileError);
        }
      }
    }

    console.log(`Sending request to Dify API with ${difyFiles.length} files`);

    // Dify APIリクエスト
    const difyResponse = await fetch(`${process.env.DIFY_API_URL}/chat-messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.DIFY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        conversation_id: conversation_id || undefined,
        user: userId,
        inputs: {},
        files: difyFiles.length > 0 ? difyFiles : undefined,
        response_mode: 'blocking'
      }),
    });

    if (!difyResponse.ok) {
      const errorText = await difyResponse.text();
      console.error('Dify API Error:', {
        status: difyResponse.status,
        body: errorText,
        requestData: {
          query: query ? '[present]' : '[empty]',
          filesCount: difyFiles.length,
          transferMethod: difyFiles.length > 0 ? difyFiles[0].transfer_method : 'none',
          uploadFileIds: difyFiles.map(f => f.upload_file_id)
        }
      });
      return NextResponse.json({ 
        error: 'Dify API request failed', 
        details: errorText,
        status: difyResponse.status
      }, { status: difyResponse.status });
    }

    const difyData = await difyResponse.json();
    
    console.log('Dify Response:', difyData); // デバッグログ追加

    try {
      // 会話とメッセージをデータベースに保存
      await createConversationAndMessages(query, difyData, userId, attachments);

      // レスポンス形式を修正
      return NextResponse.json({
        message_id: difyData.message_id,
        conversation_id: difyData.conversation_id,
        answer: difyData.answer,
        resources: difyData.metadata?.retriever_resources || [], // resourcesを直接返す
        files: attachments // ファイル情報をfilesキーで返す
      });
    } catch (dbError) {
      console.error('Database error details:', dbError);
      // データベースエラーが発生しても、チャットの応答は返す
      return NextResponse.json({
          message_id: difyData.message_id,
          conversation_id: difyData.conversation_id,
          answer: difyData.answer,
          files: attachments, // ファイル情報をfilesキーで返す
          error: 'Failed to save conversation',
          details: dbError instanceof Error ? dbError.message : 'Unknown database error'
        })}
  } catch (error) {
    console.error('Unexpected error in chat API:', error);
    return NextResponse.json({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
  }
}