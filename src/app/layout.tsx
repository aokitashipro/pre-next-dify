import "./globals.css";
import { ensureDirectories } from '@/lib/ensureDirectories';
import 'highlight.js/styles/github.css';

// サーバー起動時に必要なディレクトリを作成
ensureDirectories().catch(console.error);

export const metadata = {
  title: 'Dify Chat',
  description: 'Next.js × Dify AI Chat App',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>
        {children}
      </body>
    </html>
  );
}
