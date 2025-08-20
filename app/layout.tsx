import type { Metadata, Viewport } from 'next'
import './globals.css'
import Navbar from '../components/Navbar'

export const metadata: Metadata = {
	title: 'HackerTrace',
	description: 'Hacker-style CLI with animated world map',
}

export const viewport: Viewport = {
	themeColor: '#0A0A0A',
	colorScheme: 'dark',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en" className="h-full">
			<head>
				<link rel="preconnect" href="https://fonts.googleapis.com" />
				<link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
				<link href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@300..700&display=swap" rel="stylesheet" />
			</head>
			<body className="min-h-screen bg-[#0A0A0A] text-[#00FF88] font-mono">
				<Navbar />
				{children}
			</body>
		</html>
	)
}
