"use client";

import { useState, type FormEvent } from "react";

interface ContactFormState {
  name: string;
  email: string;
  msg: string;
}

const EMPTY_FORM: ContactFormState = { name: "", email: "", msg: "" };

export function ContactForm() {
  const [form, setForm] = useState<ContactFormState>(EMPTY_FORM);
  const [sent, setSent] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.msg.trim()) {
      setShake(true);
      setTimeout(() => setShake(false), 400);
      return;
    }

    setSending(true);
    setError(false);

    try {
      const res = await fetch("/api/contacto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("ENVIO_FALLIDO");
      setSent(form.name.trim());
    } catch {
      setError(true);
    } finally {
      setSending(false);
    }
  };

  return (
    <form className={"contact-form" + (shake ? " shake" : "")} onSubmit={onSubmit}>
      {!sent ? (
        <>
          <div className="field">
            <label>NOMBRE</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="px_kai"
            />
          </div>
          <div className="field">
            <label>CORREO ELECTRÓNICO</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="jugador@vault.gg"
            />
          </div>
          <div className="field">
            <label>MENSAJE</label>
            <textarea
              rows={5}
              value={form.msg}
              onChange={(e) => setForm({ ...form, msg: e.target.value })}
              placeholder="Cuéntanos qué tienes en mente…"
            ></textarea>
          </div>
          {error && (
            <div className="term-body" style={{ padding: "0 0 14px", fontSize: 13 }}>
              <span className="line" style={{ color: "var(--magenta)" }}>
                [ERROR] NO SE PUDO ENVIAR. INTENTA DE NUEVO.
              </span>
            </div>
          )}
          <button className="btn xl press" type="submit" style={{ width: "100%" }} disabled={sending}>
            {sending ? "▶  ENVIANDO…" : "▶  ENVIAR MENSAJE"}
          </button>
        </>
      ) : (
        <div className="terminal-success">
          <div className="term-bar">
            <span className="dot r"></span>
            <span className="dot y"></span>
            <span className="dot g"></span>
            <span className="term-title">VAULT-OS // TERMINAL</span>
          </div>
          <div className="term-body">
            <div className="line">
              <span className="prompt">vault@arcade:~$</span> ./send_message --to=team
            </div>
            <div className="line dim">[OK] Conectando con servidor…</div>
            <div className="line dim">[OK] Validando contenido…</div>
            <div className="line dim">[OK] Transmitiendo paquete…</div>
            <div className="line success">
              &gt; MENSAJE RECIBIDO. TE RESPONDEREMOS PRONTO. GRACIAS, {sent.toUpperCase()}.
              <span className="caret">_</span>
            </div>
            <div style={{ marginTop: 18 }}>
              <button
                className="btn ghost"
                type="button"
                onClick={() => {
                  setSent(null);
                  setForm(EMPTY_FORM);
                }}
              >
                ENVIAR OTRO MENSAJE
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
