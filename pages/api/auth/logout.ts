import type { NextApiRequest, NextApiResponse } from "next";
import { hashSecret, readSessionToken } from "../../../lib/employeeAuth";
import { getSupabaseAdmin } from "../../../lib/supabaseAdmin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  const supabase = getSupabaseAdmin();
  const token = readSessionToken(req);

  if (supabase && token) {
    await supabase.from("qwiz_employee_sessions").delete().eq("token_hash", hashSecret(token));
  }

  res.status(200).json({ ok: true });
}
