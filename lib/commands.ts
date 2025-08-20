import type { Command, CommandContext, CommandResult } from './types';
import { cities } from './cities';
import { generateTraceroute } from './traceroute';

function lines(...l: string[]): CommandResult { return { lines: l }; }

const help: Command = {
  name: 'help',
  description: 'List commands',
  execute: () => lines(
    'Commands:',
    '  help, cities, clear, trace-route <city>',
    '  whoami, scan <city>, ping <city>, ascii <word>',
    '  mode real|fake|3d',
    '  save, sessions, replay <id>, export <id> (json|txt)',
  )
};

const citiesCmd: Command = {
  name: 'cities',
  description: 'List available cities',
  execute: () => lines(`CITIES: ${cities.map(c => c.name).join(', ')}`)
};

const whoami: Command = {
  name: 'whoami',
  description: 'Show profile card',
  execute: (_args, ctx) => {
    const p = ctx.profile;
    if (!p) return lines('anonymous@net', 'plan: free', 'achievements: none');
    return lines(
      `${p.name} @ hackertrace`,
      `plan: ${p.plan}`,
      `achievements: ${p.achievements.length ? p.achievements.join(', ') : 'none'}`,
    );
  }
};

const mode: Command = {
  name: 'mode',
  description: 'Switch mode: real|fake|3d',
  execute: (args, ctx) => {
    const m = args[0];
    if (m === 'real') { ctx.setMode({ real: true }); return lines('MODE: REAL (uses external IP APIs)'); }
    if (m === 'fake') { ctx.setMode({ real: false }); return lines('MODE: CINEMATIC'); }
    if (m === '3d') { ctx.setMode({ map3d: true }); return lines('MAP: 3D globe'); }
    if (m === '2d') { ctx.setMode({ map3d: false }); return lines('MAP: 2D flat'); }
    return { error: 'usage: mode real|fake|3d|2d' };
  }
};

const scan: Command = {
  name: 'scan',
  description: 'Fake port scan results',
  execute: (args) => {
    const target = args[0];
    if (!target) return { error: 'usage: scan <city>' };
    const open = [22, 53, 80, 123, 443].filter(() => Math.random() > 0.3);
    return lines(
      `SCANNING ${target.toUpperCase()}...`,
      ...open.map(p => `PORT ${p}/tcp open`),
      'SCAN COMPLETE.'
    );
  }
};

const ping: Command = {
  name: 'ping',
  description: 'Simulate ping',
  execute: (args) => {
    const target = args[0];
    if (!target) return { error: 'usage: ping <city>' };
    const to = Math.floor(Math.random() * 20);
    const linesArr = [`PING ${target} with 32 bytes of data:`];
    for (let i = 0; i < 4; i++) {
      const ms = 20 + Math.floor(Math.random() * 180);
      linesArr.push(`Reply from ${target}: time=${ms}ms TTL=${64 + Math.floor(Math.random() * 64)}`);
    }
    linesArr.push(`Packets: Sent = 4, Received = ${4 - (to>15?1:0)}, Lost = ${(to>15?1:0)} (${(to>15?25:0)}% loss)`);
    return lines(...linesArr);
  }
};

const ascii: Command = {
  name: 'ascii',
  description: 'Render ASCII art word',
  execute: (args) => {
    const word = (args[0] || '').slice(0, 12);
    if (!word) return { error: 'usage: ascii <word>' };
    // very simple block letters
    const banner = `==== ${word.toUpperCase()} ====`;
    return lines(banner);
  }
};

const save: Command = {
  name: 'save',
  description: 'Save current session logs',
  execute: (_args, ctx) => {
    const session = { id: Math.random().toString(36).slice(2, 8), createdAt: Date.now(), lines: [], meta: {} };
    // Terminal will substitute actual lines when handling this command's side effect
    ctx.saveSession(session as any);
    return lines(`Saved session ${session.id}`);
  }
};

const sessions: Command = {
  name: 'sessions', description: 'List saved sessions',
  execute: async (_args, ctx) => {
    const list = await ctx.listSessions();
    if (!list.length) return lines('No sessions.');
    return lines('SESSIONS:', ...list.map(s => `${s.id} - ${new Date(s.createdAt).toLocaleString()}`));
  }
};

const replay: Command = {
  name: 'replay', description: 'Replay a session',
  execute: async (args, ctx) => {
    const id = args[0]; if (!id) return { error: 'usage: replay <id>' };
    const s = await ctx.getSession(id);
    if (!s) return { error: `not found: ${id}` };
    return { lines: s.lines };
  }
};

const exportCmd: Command = {
  name: 'export', description: 'Export a session as json or txt',
  execute: (args) => {
    const id = args[0]; const type = (args[1] || 'txt').toLowerCase();
    if (!id) return { error: 'usage: export <id> (json|txt)' };
    return lines(`Export request for ${id} (${type})`); // Terminal will handle real export
  }
};

const sudo: Command = {
  name: 'sudo', description: 'Try superuser',
  execute: () => lines('sudo: permission denied. nice try.')
};

const hackPentagon: Command = {
  name: 'hack', aliases: ['hack-pentagon'], description: 'Easter egg',
  execute: (args) => {
    if ((args[0] || '') !== 'pentagon') return { error: 'usage: hack pentagon' };
    return lines('ACCESSING PENTAGON...', 'ELEVATING PERMISSIONS...', 'ACCESS DENIED.', 'THIS INCIDENT HAS BEEN REPORTED.');
  }
};

export const baseCommands: Command[] = [help, citiesCmd, whoami, mode, scan, ping, ascii, save, sessions, replay, exportCmd, sudo, hackPentagon];

export function parseCommand(input: string): { cmd: string; args: string[] } {
  const parts = input.trim().split(/\s+/);
  const cmd = parts.shift()?.toLowerCase() || '';
  return { cmd, args: parts };
}

export function findCommand(name: string, cmds: Command[]): Command | undefined {
  const lower = name.toLowerCase();
  return cmds.find(c => c.name === lower || c.aliases?.includes(lower));
}
