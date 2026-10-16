// Cifratura dei dati riservati salvati nel repository pubblico (utenti, ordini).
// La chiave deriva da SESSION_SECRET: senza di essa i file non sono leggibili.

import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { secret } from './auth.js';

function key(scopo) {
  return createHash('sha256').update(`${secret()}:${scopo}`).digest();
}

export function encryptJson(data, scopo) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(scopo), iv);
  const enc = Buffer.concat([cipher.update(JSON.stringify(data), 'utf8'), cipher.final()]);
  return JSON.stringify({
    v: 1,
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
    data: enc.toString('base64'),
  }, null, 2) + '\n';
}

export function decryptJson(text, scopo) {
  const box = JSON.parse(text);
  const decipher = createDecipheriv('aes-256-gcm', key(scopo), Buffer.from(box.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(box.tag, 'base64'));
  const plain = Buffer.concat([decipher.update(Buffer.from(box.data, 'base64')), decipher.final()]);
  return JSON.parse(plain.toString('utf8'));
}
