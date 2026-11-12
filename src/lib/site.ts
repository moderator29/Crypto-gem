/** Brand name and official contact links. One place, so every page says the same thing. */
export const SITE = {
  name: "CryptoGemCN",
  short: "CryptoGemCN",
  tagline: "Discover crypto momentum early",
  telegramChannel: "https://t.me/cryptogems55552",
  weibo: "https://weibo.com/u/7382113120",
  admins: [
    { handle: "Hirosihi_CEO", label: "@Hirosihi_CEO", url: "https://t.me/Hirosihi_CEO" },
    { handle: "puffnutz1919", label: "@puffnutz1919", url: "https://t.me/puffnutz1919" },
  ],
} as const;

export type Admin = (typeof SITE.admins)[number];
