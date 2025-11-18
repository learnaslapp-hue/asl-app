// src/app/services/video-cache.service.ts
import { Injectable } from '@angular/core';
import { get, set, del } from 'idb-keyval';

const META = (id: string) => `video:meta:${id}`;
const BLOB = (id: string) => `video:blob:${id}`;

@Injectable({ providedIn: 'root' })
export class VideoCacheService {
  async has(fileId: string) {
    return !!(await get(BLOB(fileId)));
  }

  async blobUrl(fileId: string) {
    const b: Blob | undefined = await get(BLOB(fileId));
    return b ? URL.createObjectURL(b) : '';
  }

  /** Fire-and-forget preloader; resolves when cached. */
  async preload(fileId: string, redirectUrl: string): Promise<void> {
    // already cached?
    if (await this.has(fileId)) return;

    const resp = await fetch(redirectUrl, { redirect: 'follow' });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const blob = await resp.blob();

    await set(BLOB(fileId), blob);
    await set(META(fileId), {
      mime: resp.headers.get('content-type') || 'video/mp4',
      size: blob.size,
      savedAt: Date.now(),
    });
  }

  async purge(fileId: string) {
    await del(BLOB(fileId));
    await del(META(fileId));
  }
}
