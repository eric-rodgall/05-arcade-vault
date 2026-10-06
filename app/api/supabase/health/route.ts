import { createClient } from "@/lib/supabase/server";

export async function GET() {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    return Response.json({ ok: false, error: "CONFIG_FALTANTE" }, { status: 500 });
  }

  try {
    const supabase = await createClient();
    // Tabla inexistente a propósito: PGRST205 confirma que la URL y la key son válidas.
    const { error } = await supabase.from("health_check").select("*").limit(1);

    if (error?.code === "PGRST205") {
      return Response.json({ ok: true });
    }
  } catch {
    // Cae al error genérico de abajo.
  }

  return Response.json({ ok: false, error: "CONEXION_FALLIDA" }, { status: 500 });
}
