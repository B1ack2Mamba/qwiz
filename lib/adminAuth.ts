import type { NextApiRequest, NextApiResponse } from "next";

export function requireAdmin(req: NextApiRequest, res: NextApiResponse) {
  const adminPin = process.env.ADMIN_PIN || process.env.QWIZ_ADMIN_PIN;

  if (!adminPin && process.env.NODE_ENV !== "production") {
    return true;
  }

  if (!adminPin) {
    res.status(403).json({ error: "admin_pin_not_configured" });
    return false;
  }

  const providedPin = req.headers["x-admin-pin"];
  if (providedPin !== adminPin) {
    res.status(401).json({ error: "invalid_admin_pin" });
    return false;
  }

  return true;
}
