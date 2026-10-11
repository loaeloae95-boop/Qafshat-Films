export type Clip = {
  id: string;
  title: string;
  author: string;
  duration: string;
  plays: string;
  likes: string;
  category: string;
  gradient: string;
  badge?: string;
  mediaUrl?: string;
  mediaType?: "audio" | "video";
  coverUrl?: string;
  userId?: string;
};

export const categories = [
  "الكل",
  "كوميدي",
  "ترند",
  "كرتون",
  "صوت",
  "أفلام",
  "رياضة",
  "مرفوعاتي",
] as const;
