"use client";

import { useEffect } from 'react';
import Link from 'next/link';

export default function Page() {
	useEffect(() => { document.title = 'HackerTrace — The Hacker Universe'; }, []);
	return (
		<main className="min-h-[calc(100vh-52px)] relative overflow-hidden">
			<div className="absolute inset-0 scanlines" />
			<section className="max-w-5xl mx-auto px-6 py-16 lg:py-24">
				<h1 className="text-4xl lg:text-6xl font-bold tracking-tight">
					Welcome to <span className="text-neon">HackerTrace</span>
				</h1>
				<p className="mt-4 max-w-2xl text-neon/80">
					A cinematic, hacker-themed network terminal. Trace routes across the globe, collaborate in real-time,
					and complete missions—lit by neon phosphor.
				</p>
				<div className="mt-8 flex flex-wrap gap-3">
					<Link href="/trace" className="px-4 py-2 rounded bg-neon text-black font-semibold">Launch Trace Terminal</Link>
					<Link href="/typing" className="px-4 py-2 rounded border border-neon text-neon">Try Typing WPM</Link>
					<Link href="/pricing" className="px-4 py-2 rounded border border-neon/40 text-neon/80 hover:text-neon">View Pricing</Link>
				</div>

				<div className="mt-16 grid lg:grid-cols-2 gap-8">
					<div className="p-4 border border-neon/20 rounded bg-black/30">
						<h3 className="font-semibold mb-2">Cinematic Terminal</h3>
						<p className="text-sm text-neon/80">Glitch-typed logs, traceroute hops, packet storms, and a neon world map.</p>
					</div>
					<div className="p-4 border border-neon/20 rounded bg-black/30">
						<h3 className="font-semibold mb-2">Collaborative Ready</h3>
						<p className="text-sm text-neon/80">Rooms, shareable links, and synced traces (coming soon).</p>
					</div>
				</div>
			</section>
		</main>
	);
}
