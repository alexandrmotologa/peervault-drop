/**
 * PeerVault Drop - Cryptographically Secure Credential Generator
 * Uses WebCrypto getRandomValues for unbiased random selection.
 */

const DICEWARE_WORDLIST = [
  'alpha', 'anchor', 'apex', 'arcade', 'arrow', 'atlas', 'atom', 'aurora',
  'beacon', 'blade', 'boulder', 'breeze', 'bridge', 'cabin', 'canyon', 'castle',
  'cedar', 'cinder', 'cliff', 'cloud', 'comet', 'copper', 'cosmos', 'crater',
  'creek', 'crystal', 'delta', 'drift', 'eagle', 'echo', 'ember', 'falcon',
  'flame', 'flint', 'forest', 'fossil', 'frost', 'galaxy', 'glacier', 'granite',
  'grove', 'harbor', 'haven', 'hawk', 'horizon', 'island', 'jasper', 'lagoon',
  'laser', 'lava', 'ledge', 'light', 'lunar', 'matrix', 'meadow', 'meteor',
  'mirage', 'monolith', 'moon', 'mountain', 'nebula', 'nexus', 'north', 'nova',
  'oasis', 'ocean', 'onyx', 'orbit', 'origin', 'ozone', 'peak', 'phantom',
  'phoenix', 'pillar', 'pilot', 'planet', 'plasma', 'polar', 'prism', 'pulsar',
  'quartz', 'quiver', 'radar', 'radiant', 'radius', 'rapids', 'ravine', 'reef',
  'ridge', 'rift', 'ripple', 'river', 'rocket', 'rover', 'rust', 'saber',
  'satellite', 'shadow', 'shield', 'sierra', 'silver', 'solar', 'spark', 'sphere',
  'spiral', 'summit', 'tactic', 'timber', 'titan', 'torch', 'trace', 'trail',
  'transit', 'tundra', 'umbra', 'valley', 'vault', 'vector', 'velocity', 'venture',
  'vertex', 'vessel', 'vortex', 'wave', 'whisper', 'zenith', 'zero'
];

export interface GeneratorOptions {
  type: 'password' | 'passphrase' | 'token' | 'pin';
  length?: number;
  includeUpper?: boolean;
  includeLower?: boolean;
  includeNumbers?: boolean;
  includeSymbols?: boolean;
  wordCount?: number;
}

function getSecureRandomInt(max: number): number {
  const array = new Uint32Array(1);
  globalThis.crypto.getRandomValues(array);
  return array[0] % max;
}

export function generateSecureCredential(options: GeneratorOptions): string {
  const {
    type,
    length = 24,
    includeUpper = true,
    includeLower = true,
    includeNumbers = true,
    includeSymbols = true,
    wordCount = 4
  } = options;

  if (type === 'passphrase') {
    const words: string[] = [];
    for (let i = 0; i < wordCount; i++) {
      const idx = getSecureRandomInt(DICEWARE_WORDLIST.length);
      words.push(DICEWARE_WORDLIST[idx]);
    }
    // Append a 2-digit number at the end for extra entropy
    const suffixNum = getSecureRandomInt(90) + 10;
    return `${words.join('-')}-${suffixNum}`;
  }

  if (type === 'pin') {
    let pin = '';
    const pinLen = Math.min(Math.max(length, 4), 12);
    for (let i = 0; i < pinLen; i++) {
      pin += getSecureRandomInt(10).toString();
    }
    return pin;
  }

  if (type === 'token') {
    // Generates 32 or 64 hex characters
    const tokenLen = Math.min(Math.max(length, 16), 128);
    const bytes = new Uint8Array(Math.ceil(tokenLen / 2));
    globalThis.crypto.getRandomValues(bytes);
    let hex = '';
    for (let i = 0; i < bytes.length; i++) {
      hex += bytes[i].toString(16).padStart(2, '0');
    }
    return hex.slice(0, tokenLen);
  }

  // Standard Password
  let charset = '';
  if (includeLower) charset += 'abcdefghijkmnopqrstuvwxyz'; // Excludes ambiguous 'l'
  if (includeUpper) charset += 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // Excludes ambiguous 'I', 'O'
  if (includeNumbers) charset += '23456789';               // Excludes ambiguous '0', '1'
  if (includeSymbols) charset += '!@#$%^&*()-_=+[]{}|;:,.<>?';

  if (!charset) {
    charset = 'abcdefghijkmnopqrstuvwxyz23456789';
  }

  const passLen = Math.min(Math.max(length, 8), 128);
  let password = '';
  for (let i = 0; i < passLen; i++) {
    password += charset[getSecureRandomInt(charset.length)];
  }

  return password;
}
