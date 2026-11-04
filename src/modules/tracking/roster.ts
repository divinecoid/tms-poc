import type { LatLng } from "./geo";

// Daftar armada dan rute contoh. Dipakai bersama oleh simulasi posisi (peta) dan simulasi BBM.
const JKT: LatLng = [-6.2088, 106.8456];
const KRW: LatLng = [-6.3227, 107.3376];
const CRB: LatLng = [-6.7063, 108.557];
const SMG: LatLng = [-6.9667, 110.4167];
const SBY: LatLng = [-7.2575, 112.7521];
const BDG: LatLng = [-6.9175, 107.6191];

export const routes: Record<string, { label: string; path: LatLng[] }> = {
  jktBdg: { label: "Jakarta - Bandung", path: [JKT, [-6.2383, 106.9756], KRW, [-6.5569, 107.4431], [-6.8419, 107.488], BDG] },
  jktSmg: { label: "Jakarta - Semarang", path: [JKT, KRW, [-6.5702, 107.7603], CRB, [-6.8694, 109.1402], [-6.8886, 109.6753], SMG] },
  smgSby: { label: "Semarang - Surabaya", path: [SMG, [-6.8909, 110.6389], [-6.7084, 111.342], [-6.8976, 112.0638], [-7.16, 112.65], SBY] },
  sbyMlg: { label: "Surabaya - Malang", path: [SBY, [-7.4478, 112.7183], [-7.6453, 112.9075], [-7.9666, 112.6326]] },
  bdgCrb: { label: "Bandung - Cirebon", path: [BDG, [-6.859, 107.924], [-6.8364, 108.2274], CRB] },
  cikPriok: { label: "Cikarang - Tanjung Priok", path: [[-6.307, 107.172], [-6.2383, 106.9756], [-6.183, 106.94], [-6.105, 106.88]] },
  smgJog: { label: "Semarang - Yogyakarta", path: [SMG, [-7.14, 110.4], [-7.4797, 110.2177], [-7.7956, 110.3695]] },
  merakJkt: { label: "Merak - Jakarta", path: [[-5.93, 106.01], [-6.12, 106.15], [-6.1783, 106.6319], JKT] },
};

export type Spec = {
  id: string; plate: string; vehicleType: string; driver: string; tripNo: string; customer: string; cargo: string;
  route: keyof typeof routes; mode: "move" | "stop" | "offline"; cruise: number; offsetKm: number; at?: number; minutesAgo?: number;
};

export const specs: Spec[] = [
  { id: "u1", plate: "B 9101 KOA", vehicleType: "Wingbox", driver: "Budi Santoso", tripNo: "TRP-DEMO-0001", customer: "PT Sinar Pangan", cargo: "Mie instan 8 ton", route: "jktBdg", mode: "move", cruise: 62, offsetKm: 18 },
  { id: "u2", plate: "B 9102 KOA", vehicleType: "Tronton", driver: "Agus Wibowo", tripNo: "TRP-DEMO-0002", customer: "CV Maju Bersama", cargo: "Semen 24 ton", route: "jktSmg", mode: "move", cruise: 68, offsetKm: 120 },
  { id: "u3", plate: "H 8203 KOA", vehicleType: "Fuso", driver: "Slamet Riyadi", tripNo: "TRP-DEMO-0003", customer: "PT Tirta Segar", cargo: "Minuman 6 ton", route: "smgSby", mode: "move", cruise: 58, offsetKm: 40 },
  { id: "u4", plate: "L 7304 KOA", vehicleType: "CDD", driver: "Hendra Gunawan", tripNo: "TRP-DEMO-0004", customer: "UD Sumber Rejeki", cargo: "Elektronik 2,5 ton", route: "sbyMlg", mode: "move", cruise: 54, offsetKm: 22 },
  { id: "u5", plate: "D 6405 KOA", vehicleType: "Fuso", driver: "Dedi Kurniawan", tripNo: "TRP-DEMO-0005", customer: "PT Garmen Prima", cargo: "Tekstil 5 ton", route: "bdgCrb", mode: "move", cruise: 60, offsetKm: 70 },
  { id: "u6", plate: "B 9106 KOA", vehicleType: "CDE", driver: "Rudi Hartono", tripNo: "TRP-DEMO-0006", customer: "PT Logam Karya", cargo: "Komponen 1,8 ton", route: "cikPriok", mode: "stop", cruise: 0, offsetKm: 0, at: 0.35 },
  { id: "u7", plate: "H 8207 KOA", vehicleType: "Wingbox", driver: "Teguh Prasetyo", tripNo: "TRP-DEMO-0007", customer: "PT Kertas Nusantara", cargo: "Kertas 9 ton", route: "smgJog", mode: "stop", cruise: 0, offsetKm: 0, at: 1 },
  { id: "u8", plate: "A 5508 KOA", vehicleType: "Tronton", driver: "Wahyu Setiawan", tripNo: "TRP-DEMO-0008", customer: "CV Agro Lestari", cargo: "Pupuk 20 ton", route: "merakJkt", mode: "offline", cruise: 0, offsetKm: 0, at: 0.55, minutesAgo: 47 },
];

