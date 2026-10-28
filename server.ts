import express from 'express';
import path from 'path';
import fs from 'fs';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

app.use(express.json());

// In-memory data store
let batchesData: any[] = [];
let lastSyncTime = new Date().toISOString();
let syncStatus = 'Initialized with local cache';
let isSyncing = false;

// Helper to load local fallback data
const dataFilePath = path.join(__dirname, 'src', 'data', 'batches.json');
try {
  if (fs.existsSync(dataFilePath)) {
    const raw = fs.readFileSync(dataFilePath, 'utf-8');
    const parsed = JSON.parse(raw);
    batchesData = parsed.jc || [];
    console.log(`[Data] Loaded ${batchesData.length} batches from local cache.`);
  }
} catch (err) {
  console.error('[Data] Failed to load local batches.json:', err);
}

// Function to fetch content via HTTPS
function fetchUrl(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

// Live sync with https://spidytopper.vercel.app
async function syncFromSpidyTopper() {
  if (isSyncing) return;
  isSyncing = true;
  try {
    console.log('[Sync] Checking https://spidytopper.vercel.app for updates...');
    const homeHtml = await fetchUrl('https://spidytopper.vercel.app/');
    const chunkMatches = homeHtml.match(/static\/chunks\/[a-zA-Z0-9_\-\.]+\.js/g) || [];
    const dataChunk = chunkMatches.find((c) => c.includes('417-') || c.includes('page-'));

    if (dataChunk) {
      const chunkUrl = 'https://spidytopper.vercel.app/_next/' + dataChunk;
      console.log(`[Sync] Downloading latest data chunk: ${chunkUrl}`);
      const chunkJs = await fetchUrl(chunkUrl);
      const m = chunkJs.match(/var i=JSON\.parse\((\x27(?:[^\x27\\]|\\.)*\x27)\);/);
      if (m) {
        const parsedStr = new Function('return ' + m[1])();
        const obj = JSON.parse(parsedStr);
        if (obj && Array.isArray(obj.jc) && obj.jc.length > 0) {
          batchesData = obj.jc;
          lastSyncTime = new Date().toISOString();
          syncStatus = `Live connected: ${batchesData.length} batches synced from spidytopper.vercel.app`;
          console.log(`[Sync] Successfully updated ${batchesData.length} batches from live site!`);

          // Update local cache file
          try {
            fs.writeFileSync(dataFilePath, JSON.stringify(obj), 'utf-8');
          } catch (writeErr) {
            console.warn('[Sync] Could not save cache to disk:', writeErr);
          }
        }
      }
    }
  } catch (err: any) {
    console.error('[Sync] Error during live sync:', err.message);
    syncStatus = `Sync warning: using local cache (${err.message})`;
  } finally {
    isSyncing = false;
  }
}

// Trigger initial background sync
syncFromSpidyTopper().catch(console.error);
// Sync every 30 minutes
setInterval(syncFromSpidyTopper, 30 * 60 * 1000);

// Helper function to extract class tag (e.g. 11th, 12th, 10th, 9th)
function extractClassTag(title: string): string {
  if (/12th/i.test(title)) return '12th';
  if (/11th/i.test(title)) return '11th';
  if (/10th/i.test(title)) return '10th';
  if (/9th/i.test(title)) return '9th';
  return 'Batch';
}

// ----------------- API ROUTES -----------------

// Status and Live Sync trigger
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    source: 'https://spidytopper.vercel.app',
    batchesCount: batchesData.length,
    lastSyncTime,
    syncStatus,
    isSyncing,
  });
});

app.post('/api/refresh', async (req, res) => {
  await syncFromSpidyTopper();
  res.json({
    success: true,
    message: 'Sync completed',
    batchesCount: batchesData.length,
    lastSyncTime,
  });
});

// AROLinks 24-Hour Key Generation Proxy (bypasses browser CORS & adblock)
app.post('/api/generate-pass-link', async (req, res) => {
  try {
    let { destUrl } = req.body;
    const apiKey = '7d48c8816059dd8babd8eb3568c660bf6382d9f1';
    if (!destUrl) {
      return res.status(400).json({ error: 'destUrl is required' });
    }

    // AROLinks API requires a public web URL. If localhost, map to APP_URL or production app
    if (destUrl.includes('localhost') || destUrl.includes('127.0.0.1')) {
      const publicBase = process.env.APP_URL || 'https://spidytopper.vercel.app';
      destUrl = destUrl.replace(/https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/, publicBase);
    }

    const arolinksEndpoint = `https://arolinks.com/api?api=${apiKey}&url=${encodeURIComponent(destUrl)}`;
    const responseBody = await fetchUrl(arolinksEndpoint);
    
    try {
      const parsed = JSON.parse(responseBody);
      return res.json(parsed);
    } catch {
      return res.status(502).json({ error: 'Invalid response from AROLinks API', raw: responseBody });
    }
  } catch (err: any) {
    console.error('[AROLinks] Proxy error:', err);
    return res.status(500).json({ error: err.message || 'Failed to call AROLinks API' });
  }
});

// 1. Get all batches
app.get('/api/batches', (req, res) => {
  try {
    const list = batchesData.map((b) => ({
      id: b.batch_id,
      title: b.details?.title || 'Batch',
      thumbnail: b.details?.thumbnail || '',
      price: b.details?.price || '3000.00',
      description: b.details?.description || '',
      class_tag: extractClassTag(b.details?.title || ''),
      subjects_count: b.subjects?.length || 0,
    }));
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get batches' });
  }
});

// 2. Get batch details + top-level subjects
app.get('/api/batch/:batchId', (req, res) => {
  try {
    const batchId = req.params.batchId;
    const batch = batchesData.find((b) => String(b.batch_id) === String(batchId));
    if (!batch) {
      return res.status(404).json({ error: 'Batch not found' });
    }

    const subjects = (batch.subjects || []).map((s: any) => ({
      type: 'folder',
      entity_id: s.subject_id,
      title: s.subject_name,
      data: {
        thumbnail: s.thumbnail || '',
      },
    }));

    res.json({
      id: batch.batch_id,
      title: batch.details?.title,
      thumbnail: batch.details?.thumbnail,
      price: batch.details?.price,
      description: batch.details?.description,
      class_tag: extractClassTag(batch.details?.title || ''),
      subjects,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get batch details' });
  }
});

// 3. Get folder contents (supports both subject level and recursive subfolders)
app.get('/api/folder/:batchId/:folderId', (req, res) => {
  try {
    const { batchId, folderId } = req.params;
    const batch = batchesData.find((b) => String(b.batch_id) === String(batchId));
    if (!batch) {
      return res.status(404).json({ error: 'Batch not found' });
    }

    // Check if the folderId is a subject
    const subject = batch.subjects?.find((s: any) => String(s.subject_id) === String(folderId));
    if (subject) {
      const items = (subject.chapters || []).map((ch: any) => ({
        type: 'folder',
        entity_id: ch.folder_id,
        title: ch.title,
        data: {
          thumbnail: ch.thumbnail || '',
        },
      }));
      return res.json({
        folderId,
        parentTitle: subject.subject_name,
        items,
      });
    }

    // Otherwise, search inside chapters and subfolders
    function findFolder(chapters: any[], targetId: string): any {
      for (const item of chapters) {
        if (item.type === 'folder' && String(item.folder_id) === String(targetId)) {
          return item;
        }
        if (item.type === 'folder' && item.contents) {
          const found = findFolder(item.contents, targetId);
          if (found) return found;
        }
      }
      return null;
    }

    for (const sub of batch.subjects || []) {
      const foundFolder = findFolder(sub.chapters || [], folderId);
      if (foundFolder && foundFolder.contents) {
        const items = foundFolder.contents.map((t: any) => {
          if (t.type === 'folder') {
            return {
              type: 'folder',
              entity_id: t.folder_id,
              title: t.title,
              data: {
                thumbnail: t.thumbnail || '',
              },
            };
          } else {
            const isPdf = Boolean(t.stream_url?.toLowerCase().includes('.pdf'));
            return {
              type: 'file',
              entity_id: t.file_id,
              title: t.title,
              data: {
                thumbnail: t.thumbnail || '',
                url: t.stream_url,
                file_type: isPdf ? 1 : 2, // 1 = PDF, 2 = Video
                duration: t.duration || 0,
                is_download: t.is_downloadable ? 1 : 0,
                download_links: t.download_links || [],
              },
            };
          }
        });

        return res.json({
          folderId,
          parentTitle: foundFolder.title,
          items,
        });
      }
    }

    res.json({ folderId, parentTitle: '', items: [] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get folder contents' });
  }
});

// 4. Get specific file playback details
app.get('/api/file/:batchId/:fileId', (req, res) => {
  try {
    const { batchId, fileId } = req.params;
    const batch = batchesData.find((b) => String(b.batch_id) === String(batchId));
    if (!batch) {
      return res.status(404).json({ error: 'Batch not found' });
    }

    function findFile(items: any[], targetId: string): any {
      for (const item of items) {
        if (item.type === 'file' && String(item.file_id) === String(targetId)) {
          return item;
        }
        if (item.type === 'folder' && item.contents) {
          const found = findFile(item.contents, targetId);
          if (found) return found;
        }
      }
      return null;
    }

    for (const sub of batch.subjects || []) {
      const found = findFile(sub.chapters || [], fileId);
      if (found) {
        const isPdf = Boolean(found.stream_url?.toLowerCase().includes('.pdf'));
        return res.json({
          id: found.file_id,
          title: found.title,
          description: found.description || '',
          file_url: found.stream_url,
          file_type: isPdf ? 1 : 2,
          thumbnail: found.thumbnail || '',
          duration: found.duration || 0,
          is_download: found.is_downloadable ? 1 : 0,
          download_links: found.download_links || [],
          created_at: found.created_at || null,
        });
      }
    }

    res.status(404).json({ error: 'File not found' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get file details' });
  }
});

// 5. Global Search across batches and contents
app.get('/api/search', (req, res) => {
  const q = String(req.query.q || '').trim().toLowerCase();
  if (!q) {
    return res.json({ batches: [], files: [] });
  }

  const matchedBatches: any[] = [];
  const matchedFiles: any[] = [];

  for (const b of batchesData) {
    if (b.details?.title?.toLowerCase().includes(q)) {
      matchedBatches.push({
        id: b.batch_id,
        title: b.details.title,
        thumbnail: b.details.thumbnail,
        price: b.details.price,
      });
    }

    function searchInItems(items: any[], batchId: string, batchTitle: string) {
      for (const item of items) {
        if (item.type === 'file' && item.title?.toLowerCase().includes(q)) {
          matchedFiles.push({
            id: item.file_id,
            title: item.title,
            batchId,
            batchTitle,
            stream_url: item.stream_url,
            is_pdf: Boolean(item.stream_url?.toLowerCase().includes('.pdf')),
          });
          if (matchedFiles.length >= 30) return;
        }
        if (item.type === 'folder' && item.contents) {
          searchInItems(item.contents, batchId, batchTitle);
          if (matchedFiles.length >= 30) return;
        }
      }
    }

    for (const s of b.subjects || []) {
      searchInItems(s.chapters || [], String(b.batch_id), b.details?.title);
      if (matchedFiles.length >= 30) break;
    }
  }

  res.json({ batches: matchedBatches, files: matchedFiles.slice(0, 20) });
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 NEXT TOPPER server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(console.error);
