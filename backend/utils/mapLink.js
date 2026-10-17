
const NUM = '(-?\\d{1,3}(?:\\.\\d+)?)';

const valid = (lat, lng) =>
  Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;

const result = (lat, lng) => {
  const la = Number(lat);
  const ln = Number(lng);
  return valid(la, ln) ? { latitude: +la.toFixed(6), longitude: +ln.toFixed(6) } : null;
};

function parseCoordsFromText(input) {
  if (!input) return null;
  let text = String(input).trim();
  try { text = decodeURIComponent(text); } catch { /* keep as is */ }

  let m;
  // Google "pin" coordinates (most accurate - the dropped pin, not the viewport centre)
  if ((m = text.match(new RegExp(`!3d${NUM}!4d${NUM}`)))) return result(m[1], m[2]);
  // OpenStreetMap ?mlat=..&mlon=..
  if ((m = text.match(new RegExp(`[?&]mlat=${NUM}.*?[&]mlon=${NUM}`)))) return result(m[1], m[2]);
  // Google .../@12.97,77.59,15z
  if ((m = text.match(new RegExp(`@${NUM},\\s*${NUM}`)))) return result(m[1], m[2]);
  // ?q=12.97,77.59  ll=  query=  center=  destination=  daddr=
  if ((m = text.match(new RegExp(`[?&](?:q|ll|query|center|destination|daddr|saddr)=\\s*\\+?${NUM}\\s*,\\s*${NUM}`)))) return result(m[1], m[2]);
  // OpenStreetMap  #map=15/12.97/77.59
  if ((m = text.match(new RegExp(`#map=\\d+/${NUM}/${NUM}`)))) return result(m[1], m[2]);
  // plain "12.9716, 77.5946" (also "12.9716 77.5946")
  if ((m = text.match(new RegExp(`^\\s*${NUM}\\s*[,\\s]\\s*${NUM}\\s*$`)))) return result(m[1], m[2]);
  return null;
}

const ALLOWED_HOST = /(^|\.)(google\.[a-z.]{2,6}|goo\.gl|g\.co|openstreetmap\.org|osm\.org)$/i;
const isAllowedHost = (host) => ALLOWED_HOST.test(host);

module.exports = { parseCoordsFromText, isAllowedHost };
