"use client";

import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { City } from '../lib/cities';
import type { AppMode } from '../lib/types';

const ComposableMap = dynamic<any>(() => import('react-simple-maps').then(m => m.ComposableMap as any), { ssr: false });
const Geographies = dynamic<any>(() => import('react-simple-maps').then(m => m.Geographies as any), { ssr: false });
const Geography = dynamic<any>(() => import('react-simple-maps').then(m => m.Geography as any), { ssr: false });
const Marker = dynamic<any>(() => import('react-simple-maps').then(m => m.Marker as any), { ssr: false });
const Line = dynamic<any>(() => import('react-simple-maps').then(m => (m as any).Line as any), { ssr: false });
const Graticule = dynamic<any>(() => import('react-simple-maps').then(m => (m as any).Graticule as any), { ssr: false });
const Sphere = dynamic<any>(() => import('react-simple-maps').then(m => (m as any).Sphere as any), { ssr: false });

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

export type MapProps = {
  source: City;
  destination: City | null;
  progress: number; // 0..1 percent of typing done
  mode?: AppMode;
};

export default function WorldMap({ source, destination, progress, mode }: MapProps) {
  const [pathD, setPathD] = useState<string | null>(null);
  const [pathLen, setPathLen] = useState<number>(0);
  const animPathRef = useRef<SVGPathElement | null>(null);
  const lineGroupRef = useRef<SVGGElement | null>(null);
  const [dotPos, setDotPos] = useState<{ x: number; y: number } | null>(null);
  const [dashOffset, setDashOffset] = useState<number>(0);
  const [stormPts, setStormPts] = useState<{ x: number; y: number; id: string }[]>([]);

  // Extract great-circle path 'd'
  useEffect(() => {
    if (!destination) { setPathD(null); setPathLen(0); setDotPos(null); setDashOffset(0); return; }
    const t = setTimeout(() => {
      const p = lineGroupRef.current?.querySelector('path');
      const d = p?.getAttribute('d');
      if (d) setPathD(d);
    }, 50);
    return () => clearTimeout(t);
  }, [destination?.name]);

  // Measure the path length once we have a visible path
  useEffect(() => {
    if (!pathD) return;
    const raf = requestAnimationFrame(() => {
      if (animPathRef.current) {
        try {
          const len = animPathRef.current.getTotalLength();
          setPathLen(len);
        } catch {}
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [pathD]);

  useEffect(() => {
    if (!pathLen) return;
    setDashOffset(pathLen * (1 - progress));
    if (animPathRef.current) {
      const pt = animPathRef.current.getPointAtLength(pathLen * progress);
      setDotPos({ x: pt.x, y: pt.y });
    }
  }, [progress, pathLen]);

  // Animate packet storm along the path
  useEffect(() => {
    let raf = 0;
    function frame() {
      if (animPathRef.current && pathLen) {
        const now = Date.now();
        const seeds = 6;
        const pts: { x: number; y: number; id: string }[] = [];
        for (let i = 0; i < seeds; i++) {
          const t = ((now / (1200 + i * 173)) + i * 0.17) % 1;
          const pos = animPathRef.current.getPointAtLength(pathLen * t);
          pts.push({ x: pos.x, y: pos.y, id: `p${i}` });
        }
        setStormPts(pts);
      } else {
        setStormPts([]);
      }
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [pathLen, animPathRef.current]);

  return (
    <div className="w-full h-full relative">
      {/* Radar scan overlay */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          className="absolute left-1/2 top-1/2 w-[140%] h-[140%] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ background: 'conic-gradient(from 0deg, rgba(0,255,136,0.12), rgba(0,255,136,0) 40%)' }}
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 8, ease: 'linear' }}
        />
      </div>
      <ComposableMap projection={mode?.map3d ? 'geoOrthographic' : undefined} projectionConfig={{ scale: 170 }} style={{ width: '100%', height: '100%' }}>
        {mode?.map3d && (<>
          {/* @ts-ignore */}
          <Sphere stroke="#00FF88" strokeWidth={0.3} fill="#041c12" />
          {/* @ts-ignore */}
          <Graticule stroke="rgba(0,255,136,0.15)" />
        </>)}
        {/* @ts-ignore */}
        <Geographies geography={GEO_URL}>
          {/* @ts-ignore */}
          {({ geographies }) => geographies.map((geo: any) => (
            <Geography key={geo.rsmKey} geography={geo} style={{
              default: { fill: '#0f0f0f', outline: 'none', stroke: 'rgba(0,255,136,0.15)' },
              hover: { fill: '#0f0f0f' },
              pressed: { fill: '#0f0f0f' },
            }} />
          ))}
        </Geographies>

        {/* Invisible projected Line to get correct great-circle */}
        {destination && (
          <g ref={lineGroupRef}>
            <Line
              coordinates={[source.coordinates, destination.coordinates]}
              stroke="transparent"
              strokeWidth={2}
              fill="none"
            />
          </g>
        )}

        {/* Visible animated path */}
        {destination && pathD && (
          <>
            <motion.path
              d={pathD}
              stroke="#00FF88"
              strokeWidth={2}
              fill="none"
              key={`${pathD}-${pathLen}`}
              style={{ strokeDasharray: pathLen || undefined, strokeDashoffset: dashOffset }}
              className="drop-shadow-[0_0_6px_#00ff88]"
            />
            <path ref={animPathRef} d={pathD} stroke="transparent" fill="none" />
          </>
        )}

        {/* Source marker */}
        <Marker coordinates={source.coordinates}>
          <motion.circle r={4} fill="#00FF88" animate={{ scale: [1, 1.15, 1] }} transition={{ repeat: Infinity, duration: 2 }} className="drop-shadow-[0_0_8px_#00ff88]" />
          <text textAnchor="middle" y={-10} style={{ fill: '#00FF88', fontSize: 10 }}>{source.label}</text>
        </Marker>

        {/* Destination marker */}
        {destination && (
          <Marker coordinates={destination.coordinates}>
            <motion.circle initial={{ r: 0, opacity: 0 }} animate={{ r: 6, opacity: 1, scale: [1, 1.12, 1] }} transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 1.4 }} fill="#00FF88" className="drop-shadow-[0_0_12px_#00ff88]" />
            <text textAnchor="middle" y={-10} style={{ fill: '#00FF88', fontSize: 10 }}>{destination.label}</text>
          </Marker>
        )}

        {/* Packet dot */}
        {destination && dotPos && (
          <g>
            <motion.circle cx={dotPos.x} cy={dotPos.y} r={3} fill="#00FF88" animate={{ opacity: [1, 0.6, 1] }} transition={{ repeat: Infinity, duration: 0.8 }} className="drop-shadow-[0_0_10px_#00ff88]" />
          </g>
        )}

        {/* Packet storm in-SVG */}
        {destination && stormPts.length > 0 && (
          <g>
            {stormPts.map(p => (
              <motion.circle key={p.id} cx={p.x} cy={p.y} r={2.2} fill="#00FF88" animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 0.8 }} />
            ))}
          </g>
        )}
      </ComposableMap>
    </div>
  );
}
