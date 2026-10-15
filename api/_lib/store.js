// Archivio dei contenuti: GitHub in produzione, cartella locale durante lo sviluppo.
//
// Interfaccia comune:
//   readText(path)            -> { text, sha } | null
//   readFile(path)            -> Buffer | null
//   createUpload(buffer)      -> id da passare a commit()
//   commit({ files, message, expect })
//       files:  [{ path, text }] oppure [{ path, upload: id }]
//       expect: { path: sha } per rilevare modifiche concorrenti (409)

import { createHash, randomBytes } from 'node:crypto';
import { readFile, writeFile, mkdir, rename, access } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { httpError } from './http.js';

// Stesso calcolo usato da Git: permette di confrontare le versioni senza chiedere a GitHub
export function gitBlobSha(data) {
  const buf = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8');
  return createHash('sha1').update(`blob ${buf.length}\0`).update(buf).digest('hex');
}

function conflict() {
  return httpError(409, 'Nel frattempo qualcun altro ha pubblicato delle modifiche. Ricarica la pagina per vedere la versione aggiornata.');
}

// ----------------------------------------------------------------- GitHub

export class GitHubStore {
  constructor({ token, repo, branch, fetchImpl = globalThis.fetch }) {
    this.token = token;
    this.repo = repo;
    this.branch = branch;
    this.fetch = fetchImpl;
  }

  async api(method, path, body, accept = 'application/vnd.github+json') {
    const res = await this.fetch(`https://api.github.com/repos/${this.repo}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: accept,
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'unisono-admin',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 404) return null;
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      const err = new Error(`GitHub ${method} ${path}: ${res.status} ${text.slice(0, 300)}`);
      err.githubStatus = res.status;
      if (res.status === 401 || res.status === 403) {
        err.publicMessage = 'GitHub ha rifiutato l\'accesso: controlla il GITHUB_TOKEN su Vercel (permessi o scadenza)';
      }
      throw err;
    }
    return accept.includes('raw') ? Buffer.from(await res.arrayBuffer()) : res.json();
  }

  contentsPath(path) {
    return `/contents/${path.split('/').map(encodeURIComponent).join('/')}?ref=${encodeURIComponent(this.branch)}`;
  }

  async readText(path) {
    const data = await this.api('GET', this.contentsPath(path));
    if (!data) return null;
    let text;
    if (data.content) text = Buffer.from(data.content, 'base64').toString('utf8');
    else text = (await this.api('GET', this.contentsPath(path), null, 'application/vnd.github.raw')).toString('utf8');
    return { text, sha: data.sha };
  }

  async readFile(path) {
    return this.api('GET', this.contentsPath(path), null, 'application/vnd.github.raw');
  }

  async createUpload(buffer) {
    const data = await this.api('POST', '/git/blobs', { content: buffer.toString('base64'), encoding: 'base64' });
    return data.sha;
  }

  async commit({ files, message, expect = {} }, attempt = 0) {
    for (const [path, sha] of Object.entries(expect)) {
      const current = await this.readText(path);
      if ((current ? current.sha : null) !== sha) throw conflict();
    }
    const ref = await this.api('GET', `/git/ref/heads/${encodeURIComponent(this.branch)}`);
    if (!ref) throw new Error(`Ramo ${this.branch} non trovato`);
    const head = await this.api('GET', `/git/commits/${ref.object.sha}`);

    const tree = await this.api('POST', '/git/trees', {
      base_tree: head.tree.sha,
      tree: files.map((f) => ({
        path: f.path,
        mode: '100644',
        type: 'blob',
        ...(f.upload ? { sha: f.upload } : { content: f.text }),
      })),
    });
    const commit = await this.api('POST', '/git/commits', { message, tree: tree.sha, parents: [ref.object.sha] });
    try {
      await this.api('PATCH', `/git/refs/heads/${encodeURIComponent(this.branch)}`, { sha: commit.sha, force: false });
    } catch (err) {
      // Il ramo si è spostato nel frattempo: si riprova una volta sulla versione nuova
      if (err.githubStatus === 422 && attempt === 0) return this.commit({ files, message, expect }, 1);
      throw err;
    }
    return { commit: commit.sha };
  }
}

// ----------------------------------------------------------------- Locale (sviluppo)

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

export class LocalStore {
  constructor({ root = ROOT, onCommit } = {}) {
    this.root = root;
    this.tmp = join(root, '.tmp-uploads');
    this.onCommit = onCommit;
  }

  async readText(path) {
    try {
      const text = await readFile(join(this.root, path), 'utf8');
      return { text, sha: gitBlobSha(text) };
    } catch {
      return null;
    }
  }

  async readFile(path) {
    try {
      return await readFile(join(this.root, path));
    } catch {
      return null;
    }
  }

  async createUpload(buffer) {
    await mkdir(this.tmp, { recursive: true });
    const id = randomBytes(12).toString('hex');
    await writeFile(join(this.tmp, id), buffer);
    return id;
  }

  async commit({ files, expect = {} }) {
    for (const [path, sha] of Object.entries(expect)) {
      const current = await this.readText(path);
      if ((current ? current.sha : null) !== sha) throw conflict();
    }
    for (const f of files) {
      const dest = join(this.root, f.path);
      await mkdir(dirname(dest), { recursive: true });
      if (f.upload) {
        if (!/^[a-f0-9]{24}$/.test(f.upload)) throw httpError(400, 'File caricato non valido');
        const src = join(this.tmp, f.upload);
        await access(src).catch(() => { throw httpError(400, 'File caricato non trovato, ricaricalo'); });
        await rename(src, dest);
      } else {
        await writeFile(dest, f.text);
      }
    }
    if (this.onCommit) await this.onCommit();
    return { commit: 'locale' };
  }
}

// ----------------------------------------------------------------- Scelta dell'archivio

let current;

export function setStore(store) {
  current = store;
}

export function getStore() {
  if (current) return current;
  const token = process.env.GITHUB_TOKEN;
  if (token) {
    current = new GitHubStore({
      token,
      repo: process.env.GITHUB_REPO || 'RpR89/Unisono',
      branch: process.env.GITHUB_BRANCH || 'main',
    });
  } else if (process.env.VERCEL) {
    const err = new Error('GITHUB_TOKEN mancante');
    err.publicMessage = 'Configurazione mancante su Vercel: GITHUB_TOKEN';
    throw err;
  } else {
    current = new LocalStore();
  }
  return current;
}
