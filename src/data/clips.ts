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
  /** Present only for real user-uploaded clips (from Supabase Storage). */
  mediaUrl?: string;
  mediaType?: "audio" | "video";
};

export const categories = [
  "الكل",
  "كوميدي",
  "ترند",
  "كرتون",
  "صوت",
  "أفلام",
  "رياضة",
] as const;

export const clips: Clip[] = [
  {
    id: "1",
    title: "ضحكة الحي",
    author: "أبو ريان",
    duration: "0:08",
    plays: "12.4k",
    likes: "340",
    category: "كوميدي",
    gradient: "gradient-violet",
    badge: "صوت",
  },
  {
    id: "2",
    title: "أفهة الليل",
    author: "سالم",
    duration: "0:32",
    plays: "8.9k",
    likes: "212",
    category: "ترند",
    gradient: "gradient-teal",
  },
  {
    id: "3",
    title: "شخصية كرتونية",
    author: "نورة",
    duration: "0:11",
    plays: "23.1k",
    likes: "1.2k",
    category: "كرتون",
    gradient: "gradient-amber",
    badge: "صوت",
  },
  {
    id: "4",
    title: "صوت مضحك",
    author: "فهد",
    duration: "0:06",
    plays: "5.6k",
    likes: "148",
    category: "كوميدي",
    gradient: "gradient-rose",
  },
  {
    id: "5",
    title: "مقطع المباراة",
    author: "تركي",
    duration: "0:19",
    plays: "31.7k",
    likes: "2.4k",
    category: "رياضة",
    gradient: "gradient-indigo",
    badge: "جديد",
  },
  {
    id: "6",
    title: "جملة الفيلم",
    author: "ريم",
    duration: "0:14",
    plays: "17.2k",
    likes: "903",
    category: "أفلام",
    gradient: "gradient-lime",
  },
  {
    id: "7",
    title: "رنة الصباح",
    author: "ماجد",
    duration: "0:09",
    plays: "4.1k",
    likes: "96",
    category: "صوت",
    gradient: "gradient-violet",
  },
  {
    id: "8",
    title: "أفهة المدرسة",
    author: "هيا",
    duration: "0:21",
    plays: "9.8k",
    likes: "410",
    category: "ترند",
    gradient: "gradient-teal",
  },
];
