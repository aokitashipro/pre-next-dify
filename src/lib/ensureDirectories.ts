import { mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

// 必要なディレクトリが存在することを確認する関数
export async function ensureDirectories() {
  const uploadsDir = join(process.cwd(), 'public', 'uploads');
  
  try {
    if (!existsSync(uploadsDir)) {
      console.log('Creating uploads directory at:', uploadsDir);
      await mkdir(uploadsDir, { recursive: true });
    }
  } catch (error) {
    console.error('Error creating uploads directory:', error);
  }
}