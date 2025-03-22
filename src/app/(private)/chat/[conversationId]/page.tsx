import ChatContainer from "@/components/ChatContainer";
import ChatSidebar from "@/components/ChatSidebar";
import { auth } from '@/auth'
import { notFound } from 'next/navigation';
import { getConversation, getConversations, getMessages } from "@/lib/conversation";
import { ResourceInfo } from "@/store/chatStore";

type Params = {
  params: Promise<{conversationId: string}>
}

// 動的パラメータのプロップスを受け取る
export default async function ChatPage({ params }: Params ) {

  const session = await auth()
  const userId = session?.user?.id
  if(!session?.user?.email || !userId){
    throw new Error('不正なリクエストです')
  }

  // URLパラメータから会話IDを取得
  const {conversationId} = await params
  
  // 指定された会話が存在するか、かつ現在のユーザーのものか確認
  const conversation = await getConversation(conversationId, userId)
  // 会話が見つからない場合は404ページを返す
  if (!conversation) { notFound() }

  // サーバーで会話一覧を取得
  const conversations = await getConversations(userId)

  // クライアントに渡す形式に変換
  const formattedConversations = conversations.map(c => ({
    conversationId: c.difyConversationId || '',
    title: c.title || '無題の会話',
    updatedAt: c.updatedAt.toISOString()
  }));

  // この会話のメッセージを取得
  const messages = await getMessages(conversation.id)

  // メッセージをフォーマット
  const formattedMessages = messages.map(message => {
    let resources: ResourceInfo[] | undefined = undefined;
    
    // メタデータが存在し、オブジェクトの場合に処理
    if (message.metadata && typeof message.metadata === 'object') {
      const metadata = message.metadata as any;
      
      // resourcesプロパティからリソース情報を取得
      if (metadata.resources && Array.isArray(metadata.resources)) {
        resources = metadata.resources.map((resource: any) => ({
          document_name: resource.document_name || '',
          segment_position: resource.segment_position || 0,
          content: resource.content || '',
          score: resource.score || 0
        }));
      }
      // 後方互換性のために古い形式もチェック
      else if (metadata.retriever_resources && Array.isArray(metadata.retriever_resources)) {
        resources = metadata.retriever_resources.map((resource: any) => ({
          document_name: resource.document_name || '',
          segment_position: resource.segment_position || 0,
          content: resource.content || '',
          score: resource.score || 0
        }));
      }
    }
    
    // デバッグ用ログ
    if (resources) {
      console.log(`Message ${message.role} has ${resources.length} resources`);
    }
    
    return {
      role: message.role.toLowerCase() as 'user' | 'assistant',
      content: message.content,
      resources
    };
  });

  return (
    <div className="bg-slate-50 flex flex-col md:flex-row h-[calc(100vh-64px)] overflow-hidden">
      {/* サイドバー */}
      <div className="w-full md:w-80 order-2 md:order-1 h-20 md:h-full border-t md:border-r md:border-t-0 bg-slate-100 overflow-hidden">
        <div className="h-full overflow-y-auto">
          <ChatSidebar 
            initialConversations={formattedConversations} 
            currentConversationId={conversation.difyConversationId || ''} 
          />
        </div>
      </div>
      {/* メインコンテンツ */}
      <div className="flex-1 order-1 md:order-2 flex flex-col h-full overflow-hidden">
        <ChatContainer 
          userId={userId} 
          initialMessages={formattedMessages}
          conversationId={conversationId}
        />
      </div>
    </div>
  );
}