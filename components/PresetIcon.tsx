import { Camera, Film, Flame, Gem, Globe, Mail, MessageCircle, Monitor, Music, Smartphone, Star, Zap } from "lucide-react";
import type { PresetIcon as Name } from "@/lib/content";

const MAP = { smartphone: Smartphone, monitor: Monitor, message: MessageCircle, zap: Zap, gem: Gem, film: Film, camera: Camera, globe: Globe, flame: Flame, star: Star, music: Music, mail: Mail } as const;

export default function PresetIcon({ name, size = 18 }: { name: Name; size?: number }) {
  const I = MAP[name] ?? Film;
  return <I size={size} strokeWidth={1.7} />;
}
