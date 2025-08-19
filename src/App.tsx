import React, { useMemo, useState } from 'react';
import {
  HashRouter,
  Routes,
  Route,
  Link,
  Navigate,
  useLocation,
} from 'react-router-dom';

import { ChatFab } from './Chatbot';

// -----------------------------------------------------
// Prezentácia elektrikára + samostatná stránka Kalkulátor
// React + Tailwind (jediný súbor, pripravené na nasadenie)
// Routing: HashRouter → Domov (#/) a Kalkulátor (#/kalkulator)
// -----------------------------------------------------

// Fyzikálne konštanty (rezistivita pri ~20 °C v ohm*mm^2/m)
const RHO = {
  Cu: 0.017241, // meď
  Al: 0.028264, // hliník
} as const;

// Ponuka bežných prierezov (mm²)
const SECTIONS = [1.5, 2.5, 4, 6, 10, 16, 25, 35, 50];

// Hrubý orientačný prúd pre Cu v bežných podmienkach (nekonštruktívne, len demo!)
const AMPS_HINT_CU: Record<number, string> = {
  1.5: '10–16 A',
  2.5: '16–25 A',
  4: '25–32 A',
  6: '32–40 A',
  10: '50–63 A',
  16: '63–80 A',
  25: '80–110 A',
  35: '100–140 A',
  50: '125–170 A',
};

// Ukážková galéria – placeholders s popisom (ľahko nahradíš reálnymi fotkami v /public)
const GALLERY: { src: string; alt: string }[] = [
  { src: 'gallery/isticová-skrinka.jpg', alt: 'Rozvádzač – ističová skriňa' },
  { src: 'gallery/instalaciaVByte.jpg', alt: 'Elektroinštalácia v byte' },
  { src: 'gallery/zasuvka.jpg', alt: 'Zapojenie zásuviek' },
  { src: 'gallery/vypinac.jpg', alt: 'Vypínače a ovládanie' },
  { src: 'gallery/svietidla.jpg', alt: 'Montáž svietidiel' },
  { src: 'gallery/varna_doska.jpg', alt: 'Pripojenie varnej dosky (3F)' },
  {
    src: 'https://placehold.co/800x600?text=Rekon%C5%A1trukcia%20rozvod%C5%88a',
    alt: 'Rekonštrukcia rozvodňa',
  },
  {
    src: 'https://placehold.co/800x600?text=Meranie%20a%20revi%C3%ADzia',
    alt: 'Meranie a revízia',
  },
  {
    src: 'https://placehold.co/800x600?text=Servis%20a%20opravy',
    alt: 'Servis a opravy',
  },
];

function roundUpToList(x: number, list: number[]) {
  for (const v of list) if (x <= v) return v;
  return list[list.length - 1];
}

// ------------------------- UI: Navbar -------------------------
function Navbar() {
  const loc = useLocation();
  const onHome = loc.pathname === '/';

  const scrollToId = (id: string) => {
    if (!onHome) return; // scroll funguje len na domovskej stránke
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b border-emerald-100">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2" aria-label="Domov">
          <span className="h-8 w-8 rounded-xl bg-emerald-600 text-white grid place-content-center font-bold">
            E
          </span>
          <span className="font-semibold">Elektro servis & montáž</span>
        </Link>
        <nav className="hidden md:flex gap-6 text-sm items-center">
          {onHome ? (
            <>
              {/* Tieto položky len scrollujú na sekcie Domov stránky */}
              <button
                onClick={() => scrollToId('sluzby')}
                className="hover:text-emerald-700"
              >
                Služby
              </button>
              <button
                onClick={() => scrollToId('galeria')}
                className="hover:text-emerald-700"
              >
                Galéria
              </button>
              <button
                onClick={() => scrollToId('cennik')}
                className="hover:text-emerald-700"
              >
                Cenník
              </button>
              <button
                onClick={() => scrollToId('kontakt')}
                className="hover:text-emerald-700"
              >
                Kontakt
              </button>
            </>
          ) : null}
          {/* Link na samostatnú stránku kalkulátora */}
          <Link
            to="/kalkulator"
            className="px-3 py-1.5 rounded-xl border border-slate-300 hover:border-emerald-400"
          >
            Kalkulátor
          </Link>
          <Link
            to="/cena"
            className="px-3 py-1.5 rounded-xl border border-slate-300 hover:border-emerald-400"
          >
            Cenová kalkulácia
          </Link>
        </nav>
      </div>
    </header>
  );
}

// ------------------- Samostatný modul: Kalkulátor -------------------
function Calculator() {
  // ----------------- Kalkulátor stav -----------------
  const [system, setSystem] = useState<'DC' | '1F' | '3F'>('1F');
  const [material, setMaterial] = useState<'Cu' | 'Al'>('Cu');
  const [voltage, setVoltage] = useState(230); // menovité napätie (V)
  const [current, setCurrent] = useState(16); // prúd (A)
  const [length, setLength] = useState(25); // dĺžka jedného vodiča (m), t.j. vzdialenosť spotrebiča
  const [section, setSection] = useState(2.5); // mm²
  const [targetPct, setTargetPct] = useState(3); // cieľový max. úbytok v %

  // Prepočet úbytku (výsledok použijeme v return)
  const dropV = useMemo(() => {
    const rho = RHO[material];
    const R_per_m = rho / section; // ohm na meter vodiča
    const factor = system === '3F' ? Math.sqrt(3) : 2; // 3F: √3·I·L·R ; 1F/DC: 2·I·L·R
    return current * factor * length * R_per_m; // vo voltoch
  }, [system, material, section, current, length]);

  const dropPct = useMemo(
    () => (voltage > 0 ? (dropV / voltage) * 100 : 0),
    [dropV, voltage]
  );

  // Odporúčaný min. prierez pre zvolený cieľový úbytok (použijeme v return)
  const recommendedSection = useMemo(() => {
    const maxDropV = (targetPct / 100) * voltage;
    const rho = RHO[material];
    const factor = system === '3F' ? Math.sqrt(3) : 2;
    // S >= rho * factor * I * L / ΔV
    const sNeeded =
      (rho * factor * current * length) / Math.max(maxDropV, 1e-9);
    return roundUpToList(Math.ceil(sNeeded * 100) / 100, SECTIONS); // zaokrúhlené a zarovnané na ponuku
  }, [targetPct, voltage, material, system, current, length]);

  // Textové hodnotenie (použijeme v return)
  const stateLabel = useMemo(() => {
    if (dropPct <= 3) return 'OK (≤ 3 % – bežné pre osvetlenie)';
    if (dropPct <= 5) return 'OK (≤ 5 % – bežné pre zásuvkové obvody)';
    return 'Vysoký úbytok – zváž väčší prierez / kratšiu trasu';
  }, [dropPct]);

  // Prehľadová tabuľka – rýchle porovnanie prierezov pre aktuálne I, L, U (použijeme v return)
  const previewRows = useMemo(() => {
    const rho = RHO[material];
    const factor = system === '3F' ? Math.sqrt(3) : 2;
    return SECTIONS.map((s) => {
      const dV = current * factor * length * (rho / s);
      const pct = (dV / voltage) * 100;
      return { s, dV, pct };
    });
  }, [material, system, current, length, voltage]);

  return (
    <section
      id="kalkulator"
      className="py-16 bg-white/70 border-y border-emerald-100"
    >
      <div className="max-w-6xl mx-auto px-4">
        <h2 className="text-3xl font-bold tracking-tight">
          Kalkulátor úbytku napätia
        </h2>
        <p className="mt-2 text-slate-600">
          Výpočet je informatívny. V praxi rešpektujte STN/IEC, spôsob uloženia,
          teplotu, zoskupenie káblov a istenie.
        </p>

        <div className="mt-6 grid lg:grid-cols-2 gap-6">
          {/* Ovládanie – TU sa viažu vstupné STAVY cez value/onChange */}
          <div className="p-5 rounded-2xl bg-white border border-emerald-100 shadow-sm grid gap-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <label className="grid gap-1">
                <span className="text-sm text-slate-600">Sústava</span>
                {/* viaže: system */}
                <select
                  value={system}
                  onChange={(e) => setSystem(e.target.value as any)}
                  className="rounded-xl border p-2 border-slate-300"
                >
                  <option value="DC">DC (2 vodiče)</option>
                  <option value="1F">1-fáz AC (2 vodiče)</option>
                  <option value="3F">3-fáz AC</option>
                </select>
              </label>
              <label className="grid gap-1">
                <span className="text-sm text-slate-600">Materiál</span>
                {/* viaže: material */}
                <select
                  value={material}
                  onChange={(e) => setMaterial(e.target.value as any)}
                  className="rounded-xl border p-2 border-slate-300"
                >
                  <option value="Cu">Meď</option>
                  <option value="Al">Hliník</option>
                </select>
              </label>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <label className="grid gap-1">
                <span className="text-sm text-slate-600">Napätie U (V)</span>
                {/* viaže: voltage */}
                <input
                  type="number"
                  value={voltage}
                  onChange={(e) => setVoltage(Number(e.target.value))}
                  className="rounded-xl border p-2 border-slate-300"
                />
              </label>
              <label className="grid gap-1">
                <span className="text-sm text-slate-600">Prúd I (A)</span>
                {/* viaže: current */}
                <input
                  type="number"
                  value={current}
                  onChange={(e) => setCurrent(Number(e.target.value))}
                  className="rounded-xl border p-2 border-slate-300"
                />
              </label>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <label className="grid gap-1">
                <span className="text-sm text-slate-600">Dĺžka L (m)</span>
                {/* viaže: length (jednosmerná vzdialenosť) */}
                <input
                  type="number"
                  value={length}
                  onChange={(e) => setLength(Number(e.target.value))}
                  className="rounded-xl border p-2 border-slate-300"
                />
                <span className="text-xs text-slate-500">
                  Uveď vzdialenosť spotrebiča – dĺžka jedného vodiča.
                </span>
              </label>
              <label className="grid gap-1">
                <span className="text-sm text-slate-600">Prierez S (mm²)</span>
                {/* viaže: section; možnosti zo SECTIONS */}
                <select
                  value={section}
                  onChange={(e) => setSection(Number(e.target.value))}
                  className="rounded-xl border p-2 border-slate-300"
                >
                  {SECTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="grid gap-1">
              <span className="text-sm text-slate-600">
                Cieľový max. úbytok (%)
              </span>
              {/* viaže: targetPct */}
              <input
                type="number"
                value={targetPct}
                onChange={(e) => setTargetPct(Number(e.target.value))}
                className="rounded-xl border p-2 border-slate-300 w-40"
              />
            </label>
          </div>

          {/* Výsledky – TU sa zobrazujú hodnoty z výpočtov */}
          <div className="p-5 rounded-2xl bg-white border border-emerald-100 shadow-sm grid gap-2">
            {/* z useMemo: dropV */}
            <div className="text-lg">
              <span className="font-semibold">Úbytok ΔU:</span>{' '}
              {dropV.toFixed(2)} V
            </div>
            {/* z useMemo: dropPct */}
            <div className="text-lg">
              <span className="font-semibold">Úbytok v %:</span>{' '}
              {dropPct.toFixed(2)} %
            </div>
            {/* z useMemo: stateLabel – farba podľa dropPct */}
            <div
              className={`text-sm ${
                dropPct > 5
                  ? 'text-rose-700'
                  : dropPct > 3
                  ? 'text-amber-700'
                  : 'text-emerald-700'
              }`}
            >
              {stateLabel}
            </div>
            {/* z useMemo: recommendedSection + zároveň ukážka vstupu targetPct */}
            <div className="mt-3 text-sm text-slate-700">
              Odporúčaný najbližší prierez pre cieľ {targetPct}%:{' '}
              <span className="font-semibold">{recommendedSection} mm²</span>
            </div>
            <div className="mt-4">
              <h3 className="font-semibold">
                Rýchle porovnanie (aktuálne I, L, U)
              </h3>
              <div className="overflow-auto mt-2">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-600">
                      <th className="py-1 pr-4">Prierez</th>
                      <th className="py-1 pr-4">ΔU (V)</th>
                      <th className="py-1 pr-4">ΔU (%)</th>
                      <th className="py-1 pr-4">Amp. (Cu) ~</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* previewRows + AMPS_HINT_CU */}
                    {previewRows.map((r) => (
                      <tr key={r.s} className="border-t">
                        <td className="py-1 pr-4">{r.s} mm²</td>
                        <td className="py-1 pr-4">{r.dV.toFixed(2)}</td>
                        <td className="py-1 pr-4">{r.pct.toFixed(2)} %</td>
                        <td className="py-1 pr-4 text-slate-600">
                          {AMPS_HINT_CU[r.s as keyof typeof AMPS_HINT_CU] ??
                            '–'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Ampacity je len orientačná. Skutočná závisí od spôsobu uloženia,
                teploty, zoskupenia a normy.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// --------------------------- Stránka Cenová kalkulácia ---------------------------
function PriceCalcPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-emerald-50 text-slate-900">
      <section className="max-w-6xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
            Cenová kalkulácia
          </h1>
          <Link
            to="/"
            className="rounded-xl border border-slate-300 px-4 py-2 hover:border-emerald-400"
          >
            ← Domov
          </Link>
        </div>
      </section>
      <PriceCalculator />
      <footer className="py-10 text-center text-sm text-slate-500">
        © {new Date().getFullYear()} Elektro servis & montáž – kalkulácia
      </footer>
    </div>
  );
}

// ------------------- Samostatný modul: Cenová kalkulácia -------------------
function PriceCalculator() {
  type Key =
    | 'panel'
    | 'circuit'
    | 'socket'
    | 'switch'
    | 'light'
    | 'hob'
    | 'serviceHour';

  const SERVICES: Record<Key, { label: string; unit: string; price: number }> =
    {
      panel: {
        label: 'Inštalácia ističovej skrine (byt)',
        unit: 'ks',
        price: 180,
      },
      circuit: { label: 'Kompletný okruh zásuviek', unit: 'okruh', price: 70 },
      socket: { label: 'Výmena / doplnenie zásuvky', unit: 'ks', price: 5 },
      switch: { label: 'Vypínač (prepínač, krížový)', unit: 'ks', price: 5 },
      light: { label: 'Montáž lustra / svietidla', unit: 'ks', price: 20 },
      hob: { label: 'Pripojenie varnej dosky (3F)', unit: 'ks', price: 45 },
      serviceHour: {
        label: 'Servis – hodinová sadzba',
        unit: 'hod',
        price: 30,
      },
    };

  const [qty, setQty] = useState<Record<Key, number>>({
    panel: 0,
    circuit: 0,
    socket: 0,
    switch: 0,
    light: 0,
    hob: 0,
    serviceHour: 0,
  });
  const [materials, setMaterials] = useState(0); // € za materiál (s DPH alebo bez – podľa zvyku)
  const [km, setKm] = useState(0); // km (tam+späť spolu)
  const [kmRate, setKmRate] = useState(0.45); // €/km
  const [callout, setCallout] = useState(0); // paušál výjazdu (ak používaš)
  const [discount, setDiscount] = useState(0); // % zľava
  const [vat, setVat] = useState(20); // % DPH (SR bežne 20)

  const fmt = (n: number) =>
    n.toLocaleString('sk-SK', { style: 'currency', currency: 'EUR' });

  const items = Object.entries(SERVICES) as [Key, (typeof SERVICES)[Key]][];

  // Výpočty
  const laborSum = useMemo(() => {
    return items.reduce((s, [k, def]) => s + (qty[k] || 0) * def.price, 0);
  }, [qty]);

  const travelSum = useMemo(() => km * kmRate, [km, kmRate]);

  const subTotal = useMemo(
    () => laborSum + materials + travelSum + callout,
    [laborSum, materials, travelSum, callout]
  );
  const discountSum = useMemo(
    () => (subTotal * (discount || 0)) / 100,
    [subTotal, discount]
  );
  const net = useMemo(
    () => Math.max(0, subTotal - discountSum),
    [subTotal, discountSum]
  );
  const vatSum = useMemo(() => (net * (vat || 0)) / 100, [net, vat]);
  const total = useMemo(() => net + vatSum, [net, vatSum]);

  const copyBreakdown = async () => {
    const lines: string[] = [];
    lines.push('Cenová kalkulácia');
    lines.push('— Položky —');
    for (const [k, def] of items) {
      const q = qty[k] || 0;
      if (!q) continue;
      lines.push(
        `${def.label}: ${q} ${def.unit} × ${fmt(def.price)} = ${fmt(
          q * def.price
        )}`
      );
    }
    lines.push(`Materiál: ${fmt(materials)}`);
    lines.push(`Doprava: ${km} km × ${fmt(kmRate)} = ${fmt(travelSum)}`);
    if (callout) lines.push(`Výjazd (paušál): ${fmt(callout)}`);
    if (discount) lines.push(`Zľava ${discount}%: −${fmt(discountSum)}`);
    lines.push(`Medzisúčet: ${fmt(net)}`);
    lines.push(`DPH ${vat}%: ${fmt(vatSum)}`);
    lines.push(`Celkom: ${fmt(total)}`);

    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      alert('Rozpis skopírovaný do schránky.');
    } catch {
      alert(lines.join('\n')); // fallback
    }
  };

  return (
    <section
      id="cenova-kalkulacia"
      className="py-16 bg-white/70 border-y border-emerald-100"
    >
      <div className="max-w-6xl mx-auto px-4">
        <h2 className="text-3xl font-bold tracking-tight">Cenová kalkulácia</h2>
        <p className="mt-2 text-slate-600">
          Zadaj množstvá prác, materiál a dopravu. Výpočet je orientačný –
          konečná ponuka po obhliadke.
        </p>

        <div className="mt-6 grid lg:grid-cols-2 gap-6">
          {/* Vstupy */}
          <div className="p-5 rounded-2xl bg-white border border-emerald-100 shadow-sm grid gap-3">
            <div className="grid sm:grid-cols-2 gap-3">
              {items.map(([k, def]) => {
                const isCircuit = k === 'circuit';
                const isSocket = k === 'socket';

                // ŠPECIÁL: "Kompletný okruh zásuviek" → checkbox (0/1)
                if (isCircuit) {
                  const checked = (qty.circuit ?? 0) > 0;
                  return (
                    <label key={k} className="grid gap-1">
                      <span className="text-sm text-slate-600">
                        {def.label}{' '}
                        <span className="text-slate-500">
                          ({def.unit}, {fmt(def.price)}/{def.unit})
                        </span>
                      </span>

                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const on = e.target.checked;
                            setQty((q) => ({
                              ...q,
                              circuit: on ? 1 : 0, // zap/vyp kompletný okruh
                              socket: on ? 0 : q.socket ?? 0, // ak zapnem okruh → vynuluj zásuvky
                            }));
                          }}
                          className="h-5 w-5 accent-emerald-600"
                        />
                        <span className="text-sm text-slate-600">
                          {checked ? 'Zapnuté' : 'Vypnuté'}
                        </span>
                      </div>

                      <span className="text-xs text-slate-500">
                        Komplet okruh a jednotlivé zásuvky sa navzájom vylučujú.
                      </span>
                    </label>
                  );
                }

                // OSTATNÉ POLOŽKY (vrátane "Zásuvky") → number input
                return (
                  <label key={k} className="grid gap-1">
                    <span className="text-sm text-slate-600">
                      {def.label}{' '}
                      <span className="text-slate-500">
                        ({def.unit}, {fmt(def.price)}/{def.unit})
                      </span>
                    </span>

                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={qty[k] ?? 0}
                      onChange={(e) => {
                        let val = Math.max(
                          0,
                          Math.floor(Number(e.target.value) || 0)
                        );
                        setQty((q) => {
                          // ak zvyšujem "Zásuvky" nad 0 → automaticky vypni "Kompletný okruh"
                          if (isSocket && val > 0) {
                            return { ...q, [k]: val, circuit: 0 };
                          }
                          return { ...q, [k]: val };
                        });
                      }}
                      className="rounded-xl border p-2 border-slate-300"
                    />

                    {isSocket && (qty.circuit ?? 0) > 0 && (
                      <span className="text-xs text-slate-500">
                        Pri zadání zásuviek &gt; 0 sa „Kompletný okruh“ vypne.
                      </span>
                    )}
                  </label>
                );
              })}
            </div>

            <div className="grid sm:grid-cols-2 gap-3 mt-2">
              <label className="grid gap-1">
                <span className="text-sm text-slate-600">
                  Materiál (spolu, €)
                </span>
                <input
                  type="number"
                  min={0}
                  value={materials}
                  onChange={(e) => setMaterials(Number(e.target.value))}
                  className="rounded-xl border p-2 border-slate-300"
                />
              </label>
              <label className="grid gap-1">
                <span className="text-sm text-slate-600">
                  Doprava – km (tam+späť)
                </span>
                <input
                  type="number"
                  min={0}
                  value={km}
                  onChange={(e) => setKm(Number(e.target.value))}
                  className="rounded-xl border p-2 border-slate-300"
                />
              </label>
            </div>

            <div className="grid sm:grid-cols-3 gap-3">
              <label className="grid gap-1">
                <span className="text-sm text-slate-600">Sadzba €/km</span>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  value={kmRate}
                  onChange={(e) => setKmRate(Number(e.target.value))}
                  className="rounded-xl border p-2 border-slate-300"
                />
              </label>
              <label className="grid gap-1">
                <span className="text-sm text-slate-600">
                  Výjazd (paušál, €)
                </span>
                <input
                  type="number"
                  min={0}
                  value={callout}
                  onChange={(e) => setCallout(Number(e.target.value))}
                  className="rounded-xl border p-2 border-slate-300"
                />
              </label>
              <label className="grid gap-1">
                <span className="text-sm text-slate-600">Zľava (%)</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                  className="rounded-xl border p-2 border-slate-300"
                />
              </label>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <label className="grid gap-1">
                <span className="text-sm text-slate-600">DPH (%)</span>
                <input
                  type="number"
                  min={0}
                  max={99}
                  value={vat}
                  onChange={(e) => setVat(Number(e.target.value))}
                  className="rounded-xl border p-2 border-slate-300"
                />
              </label>
            </div>
          </div>

          {/* Výsledky */}
          <div className="p-5 rounded-2xl bg-white border border-emerald-100 shadow-sm grid gap-2">
            <div className="text-sm text-slate-600">
              Práca spolu:{' '}
              <span className="font-semibold">{fmt(laborSum)}</span>
            </div>
            <div className="text-sm text-slate-600">
              Materiál: <span className="font-semibold">{fmt(materials)}</span>
            </div>
            <div className="text-sm text-slate-600">
              Doprava: <span className="font-semibold">{fmt(travelSum)}</span>
            </div>
            {callout ? (
              <div className="text-sm text-slate-600">
                Výjazd: <span className="font-semibold">{fmt(callout)}</span>
              </div>
            ) : null}
            {discount ? (
              <div className="text-sm text-slate-600">
                Zľava {discount}%:{' '}
                <span className="font-semibold">−{fmt(discountSum)}</span>
              </div>
            ) : null}
            <hr className="my-2" />
            <div className="text-lg">
              <span className="font-semibold">Medzisúčet:</span> {fmt(net)}
            </div>
            <div className="text-lg">
              <span className="font-semibold">DPH {vat}%:</span> {fmt(vatSum)}
            </div>
            <div className="text-2xl mt-1">
              <span className="font-bold">Celkom:</span> {fmt(total)}
            </div>

            <div className="mt-4 flex gap-2 flex-wrap">
              <button
                onClick={copyBreakdown}
                className="px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
              >
                Skopírovať rozpis
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl border border-slate-300 hover:border-emerald-400"
              >
                Tlačiť / PDF
              </button>
            </div>

            <p className="text-xs text-slate-500 mt-2">
              Ceny sú orientačné; nezohľadňujú špecifické podmienky (výšky,
              drážkovanie, materiál, revízia atď.).
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ------------------------- Domovská stránka -------------------------
function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-emerald-50 text-slate-900">
      {/* HERO */}
      <section className="relative">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-emerald-300/40 blur-3xl"
        />
        <div className="max-w-6xl mx-auto px-4 py-14 grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-tight">
              Profesionálna elektroinštalácia – byt, dom, firma
            </h1>
            <p className="mt-4 text-slate-700">
              Inštalácie ističových skríň, kompletné rozvody, zapojenie
              zásuviek, vypínačov, lustrov, varných dosiek, revízie a servis.
              Čisto, bezpečne a podľa noriem.
            </p>
            <div className="mt-6 flex gap-3 flex-wrap">
              <Link
                to="/kalkulator"
                className="px-5 py-3 rounded-xl bg-emerald-600 text-white shadow hover:bg-emerald-700"
              >
                Kalkulátor úbytku
              </Link>
              <button
                onClick={() =>
                  document
                    .getElementById('kontakt')
                    ?.scrollIntoView({ behavior: 'smooth' })
                }
                className="px-5 py-3 rounded-xl border border-slate-300 hover:border-emerald-400"
              >
                Kontakt
              </button>
            </div>
          </div>
          <div className="bg-white/80 rounded-2xl border border-emerald-100 p-6 shadow grid gap-3">
            <div className="grid grid-cols-3 gap-3">
              {GALLERY.slice(0, 6).map((img, i) => (
                <img
                  key={i}
                  src={img.src}
                  alt={img.alt}
                  loading="lazy"
                  className="aspect-[4/3] w-full h-full object-cover rounded-xl border border-emerald-200"
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SLUŽBY */}
      <section
        id="sluzby"
        className="py-16 bg-white/70 border-y border-emerald-100"
      >
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold tracking-tight">Služby</h2>
          <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                t: 'Inštalácia ističových skríň',
                d: 'Montáž, zapojenie, popis okruhov, prúdové chrániče, prepäťová ochrana.',
              },
              {
                t: 'Kompletná elektroinštalácia',
                d: 'Novostavby aj rekonštrukcie – návrh, rozvod, zapojenie, merania.',
              },
              {
                t: 'Zásuvky a vypínače',
                d: 'Výmena, doplnenie okruhov, trojfázové zásuvky, chytré ovládanie.',
              },
              {
                t: 'Osvetlenie a lustre',
                d: 'Montáž svietidiel, stmievanie, LED pásy, detektory pohybu.',
              },
              {
                t: 'Varné dosky a spotrebiče',
                d: 'Pripojenie, istenie, revízia pripojenia, protokol.',
              },
              {
                t: 'Servis a revízie',
                d: 'Odhalenie porúch, merania slučky, RCD testy, protokoly o skúške.',
              },
            ].map((x, i) => (
              <div
                key={i}
                className="p-6 rounded-2xl bg-white border border-emerald-100 shadow-sm"
              >
                <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-700 grid place-content-center font-semibold">
                  {i + 1}
                </div>
                <h3 className="mt-3 font-semibold">{x.t}</h3>
                <p className="mt-1 text-slate-700 text-sm">{x.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CENNÍK (orientačný) */}
      <section id="cennik" className="py-16">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold tracking-tight">
            Orientačný cenník
          </h2>
          <p className="mt-2 text-slate-600">
            Ceny sú orientačné, konečná ponuka po obhliadke. Materiál nie je
            zahrnutý, ak nie je uvedené inak.
          </p>
          <div className="overflow-auto mt-6">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-slate-600">
                  <th className="py-2 pr-4">Služba</th>
                  <th className="py-2 pr-4">Cena od</th>
                  <th className="py-2 pr-4">Poznámka</th>
                </tr>
              </thead>
              <tbody>
                {[
                  [
                    'Montáž ističovej skrine (byt)',
                    '180 €',
                    'do 12 modulov, bez revízie',
                  ],
                  [
                    'Kompletný okruh zásuviek',
                    '70 €',
                    '1 istič, do 4 zásuviek',
                  ],
                  ['Výmena/vytvorenie zásuvky', '15 €', 'bežná inštalácia'],
                  ['Vypínač (prepínač, krížový)', '18 €', 'vrátane zapojenia'],
                  [
                    'Montáž lustra/svietidla',
                    '25 €',
                    'štandardná výška stropu',
                  ],
                  [
                    'Pripojenie varnej dosky (3F)',
                    '45 €',
                    'kontrola istenia a PE',
                  ],
                  ['Hodinová sadzba servis', '30 €', 'diagnostika porúch'],
                ].map((r, i) => (
                  <tr key={i} className="border-t">
                    <td className="py-2 pr-4">{r[0]}</td>
                    <td className="py-2 pr-4">{r[1]}</td>
                    <td className="py-2 pr-4 text-slate-600">{r[2]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* GALÉRIA – jednoduchá sekcia s obrázkami */}
      <section
        id="galeria"
        className="py-16 bg-white/70 border-y border-emerald-100"
      >
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold tracking-tight">Galéria prác</h2>
          <p> </p>
          <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {GALLERY.map((img, i) => (
              <figure
                key={i}
                className="group rounded-2xl overflow-hidden border border-emerald-100 bg-white shadow-sm"
              >
                <img
                  src={img.src}
                  alt={img.alt}
                  loading="lazy"
                  className="w-full h-56 object-cover group-hover:scale-[1.02] transition-transform"
                />
                <figcaption className="p-3 text-sm text-slate-700">
                  {img.alt}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* KONTAKT */}
      <section id="kontakt" className="py-16">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold tracking-tight">Kontakt</h2>
          <p className="mt-2 text-slate-600">
            Napíš, s čím potrebuješ pomôcť – ozvem sa a dohodneme obhliadku.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              alert(
                'Ďakujem! Toto je ukážkový formulár – napojíme ho na e‑mail alebo Forms.'
              );
            }}
            className="mt-6 grid md:grid-cols-2 gap-3"
          >
            <input
              required
              placeholder="Meno"
              className="rounded-xl border border-slate-300 p-3"
            />
            <input
              type="tel"
              placeholder="Telefón"
              className="rounded-xl border border-slate-300 p-3"
            />
            <input
              type="email"
              required
              placeholder="E‑mail"
              className="rounded-xl border border-slate-300 p-3 md:col-span-2"
            />
            <textarea
              required
              rows={5}
              placeholder="Popíš požiadavku (miesto, typ prác, termín)…"
              className="rounded-xl border border-slate-300 p-3 md:col-span-2"
            />
            <div className="md:col-span-2 flex gap-3">
              <button
                type="submit"
                className="px-5 py-3 rounded-xl bg-emerald-600 text-white shadow hover:bg-emerald-700"
              >
                Odoslať
              </button>
              <Link
                to="/kalkulator"
                className="px-5 py-3 rounded-xl border border-slate-300"
              >
                Prepočítať úbytok
              </Link>
            </div>
          </form>
        </div>
      </section>

      <footer className="py-10 text-center text-sm text-slate-500">
        © {new Date().getFullYear()} Elektro servis & montáž – profesionálne
        elektroinštalácie
      </footer>
    </div>
  );
}

// --------------------------- Stránka Kalkulátor ---------------------------
function CalculatorPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-emerald-50 text-slate-900">
      <section className="max-w-6xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
            Kalkulátor úbytku napätia
          </h1>
          <Link
            to="/"
            className="rounded-xl border border-slate-300 px-4 py-2 hover:border-emerald-400"
          >
            ← Domov
          </Link>
        </div>
      </section>
      <Calculator />
      <footer className="py-10 text-center text-sm text-slate-500">
        © {new Date().getFullYear()} Elektro servis & montáž – kalkulátor
      </footer>
    </div>
  );
}

// ------------------------------ Koreň aplikácie ------------------------------
export default function App() {
  return (
    <HashRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/kalkulator" element={<CalculatorPage />} />
        <Route path="/cena" element={<PriceCalcPage />} />{' '}
        {/* ⇦ nová stránka */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ChatFab />
    </HashRouter>
  );
}
