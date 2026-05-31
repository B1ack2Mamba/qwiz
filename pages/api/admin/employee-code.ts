import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "../../../lib/adminAuth";
import { generateAccessCode, hashSecret } from "../../../lib/employeeAuth";
import { getSupabaseAdmin } from "../../../lib/supabaseAdmin";

type CodeRequest = {
  employeeId?: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  if (!requireAdmin(req, res)) {
    return;
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    res.status(500).json({ error: "supabase_not_configured" });
    return;
  }

  const body = req.body as CodeRequest;
  const employeeId = body.employeeId?.trim();

  if (!employeeId) {
    res.status(400).json({ error: "invalid_payload" });
    return;
  }

  const code = generateAccessCode();
  const { data, error } = await supabase
    .from("qwiz_employees")
    .update({
      access_code_hash: hashSecret(code),
      access_code_set_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", employeeId)
    .select("id")
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      res.status(404).json({ error: "employee_not_found" });
      return;
    }

    res.status(500).json({ error: "supabase_error", detail: error.message });
    return;
  }

  res.status(200).json({ employeeId: data.id, code });
}
