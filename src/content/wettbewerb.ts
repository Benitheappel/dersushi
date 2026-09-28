import { asset } from "@/lib/asset";

export const VORLAGEN = [1, 2, 3].map((n) => ({ nummer: n, src: asset(`/wettbewerb/foto-${n}.jpg`) }));
