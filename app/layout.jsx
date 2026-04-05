import './globals.css'
import Providers from '@/components/Providers'

export const metadata = {
  title: 'CryptNest — A safe nest for every file.',
  description: 'Enterprise secure cloud storage for your organization.',
  icons: { icon: '/favicon.ico' },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
