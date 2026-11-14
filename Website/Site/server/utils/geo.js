import fs from 'node:fs'
import path from 'node:path'
import maxmind from 'maxmind'

const DIR = process.env.GEO_DIR || '/root/apps/Assets/geo'
const HOSTS = /hosting|hosted|cloud|data ?cent|vpn|proxy|server|colocation|colocrossing|m247|datacamp|ovh|digitalocean|hetzner|linode|akamai|vultr|choopa|constant company|amazon|google llc|google cloud|microsoft|leaseweb|contabo|netcup|packethub|clouvider|tefincom|31173|proton|mullvad|oracle|alibaba|tencent|scaleway|psychz|quadranet|zenlayer|cdn77|g-core|hostinger|ionos|upcloud|kamatera|sharktech|frantech|hivelocity|latitude[.]sh|nforce|worldstream|hostroyale|ipxo|stark industries|aeza|pq hosting|limestone|interserver|racknerd|dedipath|tzulo|performive|rackspace|fastly/i
let books = null

function newest(prefix) {
  const found = fs.readdirSync(DIR).filter(name => name.startsWith(prefix) && name.endsWith('.mmdb')).sort()
  return found.length ? path.join(DIR, found[found.length - 1]) : null
}
function open() {
  books ||= Promise.all([newest('dbip-asn-lite'), newest('dbip-city-lite')].map(file => file ? maxmind.open(file) : null)).catch(() => [null, null])
  return books
}
export async function place(ip) {
  if (!ip || ip === 'unknown') return null
  const [asns, cities] = await open()
  const a = asns?.get(ip), c = cities?.get(ip)
  if (!a && !c) return null
  const org = String(a?.autonomous_system_organization || '').slice(0, 80)
  return { asn: a?.autonomous_system_number || 0, org, city: String(c?.city?.names?.en || '').slice(0, 60), country: c?.country?.iso_code || '', lon: c?.location?.longitude, vpn: HOSTS.test(org) }
}
