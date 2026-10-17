const { parseCoordsFromText, isAllowedHost } = require('../utils/mapLink');

const MAX_HOPS = 6;
const UA = 'Mozilla/5.0 (compatible; LetsCalmHotelAdmin/1.0)';

async function followRedirects(startUrl) {
  let url = startUrl;
  for (let hop = 0; hop < MAX_HOPS; hop += 1) {
    const u = new URL(url);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') throw new Error('Unsupported link.');
    if (!isAllowedHost(u.hostname)) throw new Error('Only Google Maps or OpenStreetMap links are supported.');

    const direct = parseCoordsFromText(url);
    if (direct) return { coords: direct, finalUrl: url };

    const cont = u.searchParams.get('continue');
    if (cont) { url = cont; continue; }

    const res = await fetch(url, {
      redirect: 'manual',
      headers: { 'User-Agent': UA, 'Accept-Language': 'en' },
      signal: AbortSignal.timeout(8000),
    });
    const next = res.headers.get('location');
    if (res.status >= 300 && res.status < 400 && next) {
      url = new URL(next, url).toString();
      continue;
    }
    const html = (await res.text()).slice(0, 1_500_000);
    const fromHtml = parseCoordsFromText(html.match(/!3d-?\d+\.\d+!4d-?\d+\.\d+/)?.[0] || '')
      || parseCoordsFromText(html.match(/@-?\d+\.\d+,-?\d+\.\d+/)?.[0] || '');
    return { coords: fromHtml, finalUrl: url };
  }
  throw new Error('The link redirected too many times.');
}

exports.resolveMapLink = async (req, res, next) => {
  try {
    const raw = String(req.body.url || '').trim();
    if (!raw) return res.status(400).json({ message: 'Paste a map link first.' });

    const quick = parseCoordsFromText(raw);
    if (quick) return res.json(quick);

    let parsed;
    try { parsed = new URL(raw); } catch { return res.status(400).json({ message: 'That does not look like a valid link.' }); }
    if (!isAllowedHost(parsed.hostname))
      return res.status(400).json({ message: 'Only Google Maps or OpenStreetMap links are supported.' });

    const { coords } = await followRedirects(parsed.toString());
    if (!coords)
      return res.status(422).json({ message: 'Could not find coordinates in that link. Open the place in Google Maps, copy the link from the address bar, or type the coordinates.' });
    res.json(coords);
  } catch (err) {
    if (err.name === 'TimeoutError' || err.name === 'AbortError')
      return res.status(504).json({ message: 'Google Maps took too long to respond. Try again or paste the full link.' });
    if (/supported|redirected|Unsupported/.test(err.message)) return res.status(400).json({ message: err.message });
    if (err.name === 'TypeError') // network failure / blocked while opening the link
      return res.status(502).json({ message: 'Could not open that link from the server. Paste the full Google Maps link from the address bar, or type the coordinates.' });
    next(err);
  }
};
