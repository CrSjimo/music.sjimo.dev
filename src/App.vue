<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import {
  NButton,
  NCard,
  NEmpty,
  NH2,
  NIcon,
  NLayout,
  NLayoutContent,
  NLayoutHeader,
  NList,
  NListItem,
  NSpace,
  NTabPane,
  NTabs,
  NTag,
  NText,
  NThing,
} from 'naive-ui';
import { ArrowBackOutline } from '@vicons/ionicons5';
import { songRecords } from '@/generated/songs';
import { buildPublicAssetUrl, buildR2FileUrl } from '@/config';
import type { SongRecord } from '@/types/song';

const CC_LICENSE_REGEX = /\bCC(?:0|(?:\s+BY(?:-(?:SA|NC|ND))*))\s+\d+(?:\.\d+)?\b/g;

const selectedFolder = ref<string | null>(null);
const lyricContent = ref<string>('');
const lyricLoading = ref(false);
const lyricError = ref('');
const isMobile = ref(false);

interface LicenseTextChunk {
  text: string;
  link?: string;
}

const resolveFolderFromHash = (hash: string): string | null => {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash;
  if (!raw) {
    return null;
  }

  let folder = raw;
  try {
    folder = decodeURIComponent(raw);
  } catch {
    folder = raw;
  }

  return songRecords.some((item) => item.folder === folder) ? folder : null;
};

const writeHashFromSelectedFolder = () => {
  const nextHash = selectedFolder.value ? `#${encodeURIComponent(selectedFolder.value)}` : '';
  if (window.location.hash === nextHash) {
    return;
  }

  if (nextHash) {
    window.history.replaceState(null, '', nextHash);
    return;
  }

  const nextUrl = `${window.location.pathname}${window.location.search}`;
  window.history.replaceState(null, '', nextUrl);
};

const syncSelectedFolderFromHash = () => {
  selectedFolder.value = resolveFolderFromHash(window.location.hash);
};

const updateViewportState = () => {
  isMobile.value = window.matchMedia('(max-width: 900px)').matches;
};

onMounted(() => {
  updateViewportState();
  syncSelectedFolderFromHash();
  window.addEventListener('resize', updateViewportState);
  window.addEventListener('hashchange', syncSelectedFolderFromHash);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateViewportState);
  window.removeEventListener('hashchange', syncSelectedFolderFromHash);
});

const currentRecord = computed<SongRecord | null>(() => {
  if (!selectedFolder.value) {
    return null;
  }
  return songRecords.find((item) => item.folder === selectedFolder.value) ?? null;
});

const currentSong = computed(() => currentRecord.value?.data ?? null);

const formattedSingerLine = computed(() => {
  if (!currentSong.value) {
    return '';
  }

  const mainSingers = currentSong.value.singers.join('/');
  const feat = currentSong.value.feat_singers.join('/');
  return feat ? `${mainSingers}（feat. ${feat}）` : mainSingers;
});

const hasLyrics = computed(() => Boolean(currentSong.value?.assets.lyrics));
const hasScore = computed(() => Boolean(currentSong.value?.assets.score));

const selectSong = (folder: string) => {
  selectedFolder.value = folder;
};

const backToList = () => {
  selectedFolder.value = null;
};

const mediaDownloadUrl = (fileName: string) => {
  if (!currentRecord.value) {
    return '#';
  }
  return buildR2FileUrl(currentRecord.value.folder, fileName);
};

const buildCcLicenseUrl = (licenseText: string): string => {
  const normalized = licenseText.trim().toUpperCase();
  const parts = normalized.split(/\s+/);
  const version = parts[parts.length - 1];
  const scheme = parts.slice(0, -1).join(' ');

  if (scheme === 'CC0') {
    return `https://creativecommons.org/publicdomain/zero/${version}/`;
  }

  const code = scheme.replace(/^CC\s+/, '').toLowerCase();
  return `https://creativecommons.org/licenses/${code}/${version}/`;
};

const splitLicenseText = (licenseText: string): LicenseTextChunk[] => {
  const chunks: LicenseTextChunk[] = [];
  let lastIndex = 0;

  for (const match of licenseText.matchAll(CC_LICENSE_REGEX)) {
    const start = match.index ?? 0;
    const matchedText = match[0];
    const end = start + matchedText.length;

    if (start > lastIndex) {
      chunks.push({ text: licenseText.slice(lastIndex, start) });
    }

    chunks.push({
      text: matchedText,
      link: buildCcLicenseUrl(matchedText),
    });

    lastIndex = end;
  }

  if (lastIndex < licenseText.length) {
    chunks.push({ text: licenseText.slice(lastIndex) });
  }

  return chunks.length ? chunks : [{ text: licenseText }];
};

const loadLyrics = async () => {
  lyricContent.value = '';
  lyricError.value = '';

  if (!currentRecord.value || !currentRecord.value.data.assets.lyrics) {
    return;
  }

  lyricLoading.value = true;
  try {
    const lyricsUrl = buildPublicAssetUrl(currentRecord.value.folder, currentRecord.value.data.assets.lyrics);
    const response = await fetch(lyricsUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    lyricContent.value = await response.text();
  } catch (error) {
    console.error(error);
    lyricError.value = '歌词加载失败。';
  } finally {
    lyricLoading.value = false;
  }
};

watch(currentRecord, () => {
  loadLyrics();
});

watch(selectedFolder, () => {
  writeHashFromSelectedFolder();
});
</script>

<template>
  <n-layout class="page-shell">
    <n-layout-header class="page-header" bordered>
      <div class="header-inner">
        <h1 class="site-title">CRS MUSIC</h1>
      </div>
    </n-layout-header>

    <n-layout-content class="page-main" :class="{ mobile: isMobile }">
      <section class="song-list-panel">
        <n-card title="作品列表" size="small" class="list-card" :bordered="false">
          <n-list hoverable clickable>
            <n-list-item
              v-for="song in songRecords"
              :key="song.folder"
              :class="{ active: song.folder === selectedFolder }"
              @click="selectSong(song.folder)"
            >
              <n-thing>
                <n-text strong>{{ song.data.title }}</n-text>
              </n-thing>
            </n-list-item>
          </n-list>
        </n-card>
      </section>

      <section class="detail-panel" :class="{ mobileOverlay: isMobile && Boolean(selectedFolder) }">
        <n-card v-if="currentSong" class="detail-card" size="small" :bordered="false">
          <template #header>
            <div class="detail-header-row">
              <n-button quaternary circle size="small" @click="backToList" aria-label="返回">
                <template #icon>
                  <n-icon>
                    <ArrowBackOutline />
                  </n-icon>
                </template>
              </n-button>
              <div class="detail-title-block">
                <n-h2 style="margin: 0">{{ currentSong.title }}</n-h2>
                <n-text depth="2">{{ formattedSingerLine }}</n-text>
              </div>
            </div>
          </template>

          <n-tabs type="line" animated class="detail-tabs">
            <n-tab-pane name="song-info" tab="歌曲信息">
              <n-space vertical :size="12">
                <n-card size="small" title="Staff">
                  <div class="staff-list">
                    <div v-for="item in currentSong.staff" :key="item.type" class="staff-row">
                      <n-tag size="small" type="info">{{ item.type }}</n-tag>
                      <n-text class="staff-name">{{ item.names.join('/') }}</n-text>
                    </div>
                  </div>
                </n-card>

                <n-card size="small" title="媒体下载">
                  <n-space vertical :size="10">
                    <n-card
                      v-for="item in currentSong.media"
                      :key="item.file"
                      size="small"
                      embedded
                    >
                      <n-space vertical :size="6">
                        <div class="card-title-row">
                          <n-text strong class="media-file-name">{{ item.file }}</n-text>
                          <n-tag size="small" type="default">{{ item.description }}</n-tag>
                        </div>
                        <n-text depth="3">{{ item.format }}</n-text>
                        <a
                          :href="mediaDownloadUrl(item.file)"
                          :download="item.file"
                          target="_blank"
                          rel="noopener noreferrer"
                          class="download-link"
                        >
                          下载文件
                        </a>
                      </n-space>
                    </n-card>
                  </n-space>
                </n-card>

                <n-card v-if="currentSong.links.length" size="small" title="外部链接">
                  <n-space vertical :size="8">
                    <a
                      v-for="item in currentSong.links"
                      :key="item.url"
                      :href="item.url"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="download-link"
                    >
                      {{ item.name }}
                    </a>
                  </n-space>
                </n-card>

                <n-card size="small" title="版权信息">
                  <n-space vertical :size="10">
                    <n-card
                      v-for="(item, idx) in currentSong.copyright"
                      :key="`${item.scope}-${idx}`"
                      size="small"
                      embedded
                    >
                      <n-space vertical :size="6">
                        <n-text strong>{{ item.scope }}</n-text>
                        <div class="card-title-row">
                          <n-tag size="small" type="info" class="license-tag">
                            <span class="license-text-wrap">
                              <template v-for="(chunk, chunkIndex) in splitLicenseText(item.license)" :key="`${item.scope}-${idx}-${chunkIndex}`">
                                <a
                                  v-if="chunk.link"
                                  :href="chunk.link"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  class="license-link"
                                >
                                  {{ chunk.text }}
                                </a>
                                <span v-else>{{ chunk.text }}</span>
                              </template>
                            </span>
                          </n-tag>
                          <n-text>{{ item.holders.join('/') }}</n-text>
                        </div>
                        <n-text depth="2"></n-text>
                      </n-space>
                    </n-card>
                  </n-space>
                </n-card>
              </n-space>
            </n-tab-pane>

            <n-tab-pane v-if="hasLyrics" name="lyrics" tab="歌词">
              <div class="lyrics-wrap">
                <n-text v-if="lyricLoading" depth="3">歌词加载中...</n-text>
                <n-text v-else-if="lyricError" type="error">{{ lyricError }}</n-text>
                <pre v-else class="lyrics-text">{{ lyricContent }}</pre>
              </div>
            </n-tab-pane>

            <n-tab-pane v-if="hasScore" name="score" tab="乐谱">
              <n-empty description="乐谱展示功能待完善" />
            </n-tab-pane>
          </n-tabs>
        </n-card>

        <n-card v-else class="detail-card placeholder" size="small" :bordered="false">
          <n-empty description="请选择作品以查看详情" />
        </n-card>
      </section>
    </n-layout-content>
  </n-layout>
</template>

<style scoped>
.page-shell {
  min-height: 100vh;
}

.page-header {
  height: 68px;
  display: flex;
  align-items: center;
  background: #ffffff;
}

.header-inner {
  width: 100%;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding: 0 16px;
}

.site-title {
  margin: 0;
  font-size: 24px;
  line-height: 1;
}

.page-main {
  min-height: calc(100vh - 68px);
}

.page-main :deep(.n-layout-scroll-container) {
  min-height: calc(100vh - 68px);
  display: flex;
  gap: 0;
  padding: 0;
}

.song-list-panel {
  width: 320px;
  flex: 0 0 auto;
  min-width: 0;
}

.list-card {
  height: 100%;
  border-radius: 0;
}

.detail-panel {
  flex: 1;
  min-width: 0;
  border-left: 1px solid #ebedf0;
}

.detail-card {
  height: 100%;
  border-radius: 0;
}

.detail-card :deep(.n-card-content) {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.detail-header-row {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 12px;
}

.detail-title-block {
  min-width: 0;
}

.detail-tabs {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.line-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.staff-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  width: 100%;
}

.staff-row {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border: 1px solid #ebedf0;
  border-radius: 6px;
}

.staff-name {
  white-space: nowrap;
}

.card-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.media-file-name {
  word-break: break-all;
}

.license-text-wrap {
  color: inherit;
}

.license-link {
  color: inherit;
  text-decoration: underline;
  text-decoration-style: dashed;
  text-underline-offset: 2px;
}

.license-link:hover {
  opacity: 0.85;
}

.download-link {
  color: #2080f0;
  text-decoration: none;
}

.download-link:hover {
  text-decoration: underline;
}

.lyrics-wrap {
  min-height: 240px;
}

.lyrics-text {
  margin: 0;
  padding: 12px;
  border-radius: 8px;
  white-space: pre-wrap;
  word-break: break-word;
  background: #fafafa;
  border: 1px solid #ebedf0;
}

.placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
}

:deep(.n-list-item.active) {
  background: #f2f7ff;
}

.page-main.mobile {
  min-height: calc(100vh - 68px);
}

.page-main.mobile :deep(.n-layout-scroll-container) {
  position: relative;
  display: block;
  padding: 0;
}

.page-main.mobile .song-list-panel {
  width: 100%;
}

.page-main.mobile .detail-panel {
  display: none;
}

.page-main.mobile .detail-panel.mobileOverlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border-left: 0;
  display: block;
  z-index: 20;
}

@media (max-width: 900px) {
  .site-title {
    font-size: 20px;
  }
}
</style>
