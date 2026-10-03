import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "คิวงาน",
    short_name: "คิวงาน",
    description: "ตอบว่าว่างไหม เสนอเวลาว่าง และลง Teamup จากปฏิทิน Outlook",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f6f9",
    theme_color: "#1f2a44",
    lang: "th",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
