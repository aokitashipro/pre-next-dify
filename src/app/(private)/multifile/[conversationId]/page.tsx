import ChatContainer from "@/components/ChatContainer";
import ChatSidebar from "@/components/ChatSidebar";
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation';

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
  const conversation = await prisma.conversation.findUnique({
    where: {
      difyConversationId_userId: {
        difyConversationId: conversationId,
        userId: userId
      }
    }
  });

  // 会話が見つからない場合は404ページを返す
  if (!conversation) {
    notFound();
  }

  // サーバーで会話一覧を取得
  const conversations = await prisma.conversation.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    take: 50
  });

  // クライアントに渡す形式に変換
  const formattedConversations = conversations.map(c => ({
    id: c.id,
    difyConversationId: c.difyConversationId || '',
    title: c.title || '無題の会話',
    updatedAt: c.updatedAt.toISOString()
  }));

  // この会話のメッセージを取得
  const messages = await prisma.message.findMany({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: 'asc' }
  });

  // メッセージをフォーマット
  const formattedMessages = messages.map(message => ({
    id: message.id,
    role: message.role.toLowerCase() as 'user' | 'assistant',
    content: message.content,
    createdAt: message.createdAt.toISOString()
  }));

  return (
    <div className="bg-slate-50 flex flex-col md:flex-row h-[calc(100vh-64px)] overflow-hidden">
      {/* サイドバー */}
      <div className="w-full md:w-80 order-2 md:order-1 h-20 md:h-full border-t md:border-r md:border-t-0 bg-slate-100 overflow-hidden">
        <div className="h-full overflow-y-auto">
          <ChatSidebar 
            initialConversations={formattedConversations} 
            currentConversationId={conversationId} 
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