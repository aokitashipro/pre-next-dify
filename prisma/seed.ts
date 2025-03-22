// primsa.対象テーブル名.メソッド のように記述
import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    // クリーンアップ
    await prisma.user.deleteMany()
    const hashedPassword = await bcrypt.hash('password123', 12) // 暗号化

    // ユーザー作成
    const adminUser = await prisma.user.create({
        data: {
            email: 'admin@example.com',
            name: 'Admin User',
            password: hashedPassword,
            role: 'ADMIN'
    }})
    const user = await prisma.user.create({
        data: {
            email: 'test@example.com',
            name: 'Test User',
            password: hashedPassword,
            role: 'USER'
    }})
    
    console.log( { adminUser, user })

    const allUsers = await prisma.user.findMany();
    console.log('Available users:', allUsers);
}

main()
    .catch((e) => { 
        console.error(e) 
        process.exit(1)   
    })
    .finally(async () => {
        await prisma.$disconnect()  
    })