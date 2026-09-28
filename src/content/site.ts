import { t } from "./texts";

const n = t.ueberall.navigation;

export const navItems = [
  { no: "00", href: "/", label: n.start.name, preview: n.start.vorschau },
  { no: "01", href: "/about", label: n.ueberMich.name, preview: n.ueberMich.vorschau },
  { no: "02", href: "/promises", label: n.versprechen.name, preview: n.versprechen.vorschau },
  { no: "03", href: "/videos", label: n.videos.name, preview: n.videos.vorschau },
  { no: "04", href: "/games", label: n.spiele.name, preview: n.spiele.vorschau },
  { no: "05", href: "/wettbewerb", label: n.wettbewerb.name, preview: n.wettbewerb.vorschau },
  { no: "06", href: "/blog", label: n.blog.name, preview: n.blog.vorschau },
  { no: "07", href: "/balls-destroyer", label: n.eierZerstoerer.name, preview: n.eierZerstoerer.vorschau },
];
