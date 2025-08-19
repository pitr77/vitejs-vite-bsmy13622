import React from "react";

type Msg = { role: "user" | "assistant"; content: string };

export function ChatFab() {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      {open && <ChatWindow onClose={() => setOpen(false)} />}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-50 rounded-full px-5 py-3 shadow-lg bg-emerald-600 text-white hover:bg-emerald-700"
      >
        Chat
      </button>
    </>
  );
}

function ChatWindow({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = React.useState<Msg[]>([
    { role: "assistant", content: "Ahoj! Som asistent pre elektro. Ako ti môžem pomôcť?" },
  ]);
  const [input, setInput] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    const next = [...messages, { role: "user", content: text } as Msg];
    setMessages(next);
    setBusy(true);
    try {      
      const API_BASE =
      (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/$/, "") || "";

      const res = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            { role: "system", content: "Si užitočný asistent elektrikára. Odpovedaj stručne po slovensky." },
            ...next,
          ],
        }),
      });
      const data = await res.json();
      const reply = (data?.reply as string) || "Prepáč, nerozumiem.";
      setMessages(m => [...m, { role: "assistant", content: reply }]);
    } catch (e) {
      setMessages(m => [...m, { role: "assistant", content: "Niekde sa to zaseklo. Skús znova." }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed bottom-20 right-5 z-50 w-[min(420px,calc(100vw-2rem))] rounded-2xl border border-emerald-100 bg-white shadow-xl">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="font-semibold">Asistent (AI)</div>
        <button onClick={onClose} className="text-slate-500 hover:text-slate-700">✕</button>
      </div>

      <div className="h-72 overflow-y-auto px-4 py-3 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "text-right" : "text-left"}>
            <div className={`inline-block px-3 py-2 rounded-2xl text-sm ${
              m.role === "user" ? "bg-emerald-600 text-white rounded-br-sm" : "bg-slate-100 rounded-bl-sm"
            }`}>
              {m.content}
            </div>
          </div>
        ))}
        {busy && <div className="text-left text-xs text-slate-500">…píšem odpoveď</div>}
      </div>

      <div className="flex gap-2 p-3 border-t">
        <input
          className="flex-1 rounded-xl border border-slate-300 px-3 py-2"
          placeholder="Napíš otázku…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => (e.key === "Enter" ? send() : null)}
          disabled={busy}
        />
        <button
          onClick={send}
          disabled={busy}
          className="px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          Poslať
        </button>
      </div>
    </div>
  );
}
