export interface Batch {
  id: number;
  title: string;
  thumbnail: string;
  price: string;
  description: string;
  class_tag: string;
  subjects_count?: number;
}

export interface SubjectItem {
  type: 'folder';
  entity_id: number;
  title: string;
  data: {
    thumbnail: string;
  };
}

export interface BatchDetail extends Batch {
  subjects: SubjectItem[];
}

export interface FolderItem {
  type: 'folder' | 'file';
  entity_id: number;
  title: string;
  data: {
    thumbnail?: string;
    url?: string;
    file_type?: number; // 1 = PDF, 2 = Video
    duration?: number;
    is_download?: number;
    download_links?: { title: string; url: string }[];
  };
}

export interface FolderResponse {
  folderId: string;
  parentTitle: string;
  items: FolderItem[];
}

export interface FileDetail {
  id: number;
  title: string;
  description?: string;
  file_url: string;
  file_type: number; // 1 = PDF, 2 = Video
  thumbnail?: string;
  duration?: number;
  is_download?: number;
  download_links?: { title: string; url: string }[];
  created_at?: number | null;
}

export interface BreadcrumbStep {
  id: string | number;
  title: string;
}
