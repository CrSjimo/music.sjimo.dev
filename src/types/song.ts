export interface StaffCredit {
  type: string;
  names: string[];
}

export interface SongAssets {
  lyrics?: string;
  score?: string;
}

export interface SongMediaItem {
  file: string;
  description: string;
  format: string;
}

export interface SongLink {
  name: string;
  url: string;
}

export interface SongCopyrightItem {
  scope: string;
  license: string;
  holders: string[];
}

export interface SongIndex {
  title: string;
  singers: string[];
  feat_singers: string[];
  staff: StaffCredit[];
  assets: SongAssets;
  media: SongMediaItem[];
  links: SongLink[];
  copyright: SongCopyrightItem[];
}

export interface SongRecord {
  folder: string;
  data: SongIndex;
}
