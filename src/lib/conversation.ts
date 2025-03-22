import { prisma } from './prisma';

export async function getConversation(conversationId: string, userId: string){
    return await  prisma.conversation.findUnique({
        where: {
          difyConversationId_userId: {
            difyConversationId: conversationId,
            userId: userId
          }}})
}

// 会話一覧取得
export async function getConversations(userId: string){
    return await prisma.conversation.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        take: 50,
        select: {
          id: true,
          difyConversationId: true,
          title: true,
          updatedAt: true
        }
    });
} 

// 会話のメッセージ取得
export async function getMessages(id: string){
    return await prisma.message.findMany({
        where: { conversationId: id },
        orderBy: { createdAt: 'asc' },
        select: {
          role: true,
          content: true,
          metadata: true
        }
      });
}