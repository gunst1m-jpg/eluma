// /api/portal/logg-ut.js — logg ut: nuller sesjons-cookien.
import { slettCookie } from "./_auth.js";

export default async function handler(req, res) {
  slettCookie(res);
  return res.status(200).json({ ok: true });
}
