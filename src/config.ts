const trimSlash = (value: string) => value.replace(/\/$/, '');

export const appConfig = {
  r2Url: trimSlash(import.meta.env.VITE_R2_URL ?? ''),
};

export const withBase = (path: string) => {
  const base = import.meta.env.BASE_URL;
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
  return `${normalizedBase}${normalizedPath}`;
};

export const buildR2FileUrl = (songFolder: string, fileName: string) => {
  if (!appConfig.r2Url) {
    return '#';
  }

  const encodedSong = encodeURIComponent(songFolder);
  const encodedFile = encodeURIComponent(fileName);
  return `${appConfig.r2Url}/${encodedSong}/${encodedFile}`;
};

export const buildPublicAssetUrl = (songFolder: string, fileName: string) => {
  const encodedSong = encodeURIComponent(songFolder);
  const encodedFile = encodeURIComponent(fileName);
  return withBase(`data/${encodedSong}/${encodedFile}`);
};
