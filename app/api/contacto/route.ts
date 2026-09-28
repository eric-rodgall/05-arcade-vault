import { Resend } from "resend";

interface ContactRequestBody {
  name: string;
  email: string;
  msg: string;
}

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<ContactRequestBody>;
  const { name, email, msg } = body;

  if (!name?.trim() || !email?.trim() || !msg?.trim()) {
    return Response.json({ ok: false, error: "CAMPOS_VACIOS" }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const toEmail = process.env.RESEND_TO_EMAIL;

  if (!apiKey || !toEmail) {
    return Response.json({ ok: false, error: "ENVIO_FALLIDO" }, { status: 500 });
  }

  const resend = new Resend(apiKey);

  const { error } = await resend.emails.send({
    from: "onboarding@resend.dev",
    to: toEmail,
    replyTo: email,
    subject: `Arcade Vault · Nuevo mensaje de ${name}`,
    text: `Nombre: ${name}\nCorreo: ${email}\n\n${msg}`,
  });

  if (error) {
    return Response.json({ ok: false, error: "ENVIO_FALLIDO" }, { status: 500 });
  }

  return Response.json({ ok: true });
}
