import { Request, Response } from 'express';

const MEASUREMENT_ID = process.env.GA_MEASUREMENT_ID; // e.g. G-XXXXXXX
const API_SECRET = process.env.GA_API_SECRET; // from Google Analytics Admin > Data Streams > Measurement Protocol > Create secret

function ensureConfig(res: Response) {
  if (!MEASUREMENT_ID || !API_SECRET) {
    res.status(500).json({ error: 'Measurement Protocol not configured on server' });
    return false;
  }
  return true;
}

export async function collect(req: Request, res: Response) {
  if (!ensureConfig(res)) return;

  try {
    const payload = req.body;

    // Basic validation
    if (!payload || typeof payload !== 'object') {
      return res.status(400).json({ error: 'Invalid payload' });
    }

    // The Measurement Protocol endpoint for GA4
    const url = `https://www.google-analytics.com/mp/collect?measurement_id=${MEASUREMENT_ID}&api_secret=${API_SECRET}`;

    const response = await (globalThis as any).fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(502).json({ error: 'GA MP error', status: response.status, body: text });
    }

    return res.status(204).send();
  } catch (error: any) {
    console.error('[analytics] MP error', error);
    return res.status(500).json({ error: 'Internal error sending to GA MP', details: error.message });
  }
}

export default { collect };
