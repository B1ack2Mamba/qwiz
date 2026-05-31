import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "../../../lib/adminAuth";
import { getSupabaseAdmin } from "../../../lib/supabaseAdmin";

type EmployeeRequest = {
  id?: string;
  name?: string;
  role?: string;
  avatar?: string;
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

  const body = req.body as EmployeeRequest;
  const id = normalizeId(body.id || body.name || "");
  const name = body.name?.trim();
  const role = body.role?.trim();
  const avatar = body.avatar?.trim().slice(0, 4) || initialsFromName(name || id);

  if (!id || !name || !role) {
    res.status(400).json({ error: "invalid_payload" });
    return;
  }

  const { error } = await supabase.from("qwiz_employees").upsert(
    {
      id,
      full_name: name,
      role,
      avatar,
      is_active: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  if (error) {
    res.status(500).json({ error: "supabase_error", detail: error.message });
    return;
  }

  res.status(200).json({ ok: true, id });
}

function normalizeId(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function initialsFromName(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
