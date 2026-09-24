export const CARD_OPTIONS = {
  background: [
    ['midnight','Midnight',0,['#202630','#101319']], ['graphite','Graphite',0,['#373b43','#181a21']],
    ['ember','Ember',1,['#542719','#21151b']], ['ocean','Ocean',1,['#164052','#111c30']],
    ['orbit','Orbit',1,['#392758','#17182c']], ['forest','Forest',1,['#2e4736','#101d1b']],
    ['aurora','Aurora',2,['#195445','#262346']], ['rose','Rose',2,['#53243e','#241824']],
    ['glacier','Glacier',2,['#36576b','#172537']], ['solar','Solar',2,['#66451d','#291821']],
    ['ultraviolet','Ultraviolet',2,['#58217b','#181a43']], ['hologram','Hologram',2,['#3c3657','#193a3d','#40244c']],
  ].map(([id,label,level,colors])=>({id,label,level,colors})),
  pattern: [['orbit','Orbital',0],['plain','Clean',0],['grid','Grid',1],['contour','Contours',1],['forest','Treetops',2],['waves','Waves',2],['prism','Prismatic',2],['stars','Constellation',2]].map(([id,label,level])=>({id,label,level})),
  font: [
    ['sans','Classic',0,'Arial, sans-serif'], ['sora','Sora',0,'CardFont, sans-serif','sora-variable.ttf'],
    ['serif','Editorial',1,'Georgia, serif'], ['mono','Mono',1,'monospace'],
    ['pixel','Pixel',1,'CardFont, monospace','card-pixelify.ttf'], ['space','Space Grotesk',2,'CardFont, sans-serif','card-space.ttf'],
    ['display','Bebas Neue',2,'CardFont, sans-serif','card-display.ttf'], ['archivo','Archivo',2,'CardFont, sans-serif','archivo-latin.woff2'],
    ['rounded','Rounded',2,'Trebuchet MS, sans-serif'], ['impact','Bold',2,'Impact, sans-serif'],
  ].map(([id,label,level,family,file])=>({id,label,level,family,file})),
  accent: [['warm','Warm',0,'#f4af83'],['silver','Silver',0,'#d6dce5'],['ice','Ice',2,'#9cdaee'],['mint','Mint',2,'#b1ecc9'],['lilac','Lilac',2,'#d5b9fa'],['gold','Gold',2,'#f5d18e'],['coral','Coral',2,'#ffaaa4'],['lime','Lime',2,'#d4ed9b']].map(([id,label,level,color])=>({id,label,level,color})),
  layout: [{id:'stats',label:'Stat card',level:0},{id:'name',label:'Name card',level:2}],
};
export function clampCard(input, level = 0) {
  return Object.fromEntries(Object.entries(CARD_OPTIONS).map(([key, options]) => [key, options.find(option => option.id === input?.[key] && option.level <= level)?.id || options[0].id]));
}
export function validateCard(input, level = 0) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(key => !Object.hasOwn(CARD_OPTIONS, key))) return {error:'Choose a valid card style',statusCode:400};
  for (const [key, options] of Object.entries(CARD_OPTIONS)) {
    const option = options.find(item => item.id === (input[key] ?? (key === 'pattern' ? 'orbit' : null)));
    if (!option) return {error:'Choose a valid '+key,statusCode:400};
    if (option.level > level) return {error:'This card option requires '+(option.level === 2 ? 'Pro' : 'Plus'),statusCode:403};
  }
  return {card:clampCard(input,level)};
}
function escapeText(value) {
  return String(value ?? '').replace(/[\u0000-\u001f\u007f]/g,'').slice(0,48).replace(/[&<>"']/g,character=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'})[character]);
}
function count(value) { return String(Math.min(999999999,Math.max(0,Math.round(Number(value)||0)))); }
function embedded(value,type) { return typeof value==='string' && new RegExp(`^data:${type};base64,[A-Za-z0-9+/=]+$`).test(value) ? value : ''; }
function scenery(pattern,accent) {
  const path=d=>`<path d="${d}" fill="none" stroke="${accent}" stroke-opacity=".16"/>`;
  if(pattern==='plain')return '';
  if(pattern==='grid')return `<pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">${path('M40 0H0V40')}</pattern><rect width="900" height="450" fill="url(#grid)"/>`;
  if(pattern==='orbit')return [130,190,250].map(r=>`<ellipse cx="725" cy="150" rx="${r}" ry="${r*.54}" transform="rotate(-30 725 150)" stroke="${accent}" stroke-opacity=".13" fill="none"/>`).join('');
  if(pattern==='contour'||pattern==='waves')return Array.from({length:12},(_,i)=>path(pattern==='waves'?`M-50 ${60+i*30}C200 ${-80+i*30} 330 ${390+i*12} 610 ${110+i*30}S950 ${90+i*25} 1000 ${290+i*20}`:`M${440+i*22} -20C${160+i*25} 160 ${950-i*16} 140 ${470+i*34} 480`)).join('');
  if(pattern==='forest')return Array.from({length:13},(_,i)=>`<path d="M${i*80-60} 340l48 -${100+i%3*35} 48 ${100+i%3*35}h-40v80h-16v-80z" fill="${accent}" opacity="${.04+i%3*.025}"/>`).join('');
  if(pattern==='prism')return `<path d="M390 0L640 450H870L620 0Z" fill="${accent}" opacity=".08"/>${path('M0 20L900 300M0 290L810 0M190 450L900 60M500 0L890 450')}`;
  return Array.from({length:34},(_,i)=>`<circle cx="${(i*173+51)%900}" cy="${(i*79+21)%450}" r="${i%5===0?2:1}" fill="${accent}" opacity=".35"/>`).join('')+path('M525 89L698 168L871 247L598 326L525 89');
}
export function renderProfileCard(profile={},input={},level=0,assets={}) {
  const card=clampCard(input,level);
  const option=key=>CARD_OPTIONS[key].find(item=>item.id===card[key]);
  const colors=option('background').colors,accent=option('accent').color;
  const rawName=String(profile.discordName||profile.name||'Unknown player').slice(0,48);
  const name=escapeText(rawName),gameName=escapeText(profile.gameName||'Not connected'),rank=escapeText(profile.rank||'Unranked');
  const avatar=embedded(assets.avatar,'image/(?:png|webp|jpeg|gif)'),badge=embedded(assets.badge,'image/png'),font=embedded(assets.font,'font/(?:ttf|woff2)');
  const percent=Math.max(0,Math.min(100,Number(profile.percent)||0));
  const hours=Math.floor(Math.max(0,Number(profile.runtime)||0)/3600),minutes=Math.floor(Math.max(0,Number(profile.runtime)||0)%3600/60);
  const stats=[['ELO',count(profile.elo)],['WINS',count(profile.wins)],['TAGS',count(profile.tags)],['ROUNDS',count(profile.rounds)],['RUNTIME',hours?`${hours}h ${minutes}m`:`${minutes}m`]];
  const tiles=card.layout==='stats'?stats.map(([label,value],i)=>`<g transform="translate(${36+i*167} 309)"><rect width="155" height="88" rx="10" fill="#080c13" fill-opacity=".4"/><rect y="18" width="2" height="50" rx="1" fill="${accent}" opacity=".7"/><text x="16" y="28" font-family="Arial,sans-serif" font-size="11" letter-spacing="1.5" fill="#bec6d1">${label}</text><text x="16" y="64" font-size="${value.length>8?21:27}" font-weight="700" fill="#fff">${value}</text></g>`).join(''):`<text x="40" y="364" font-size="42" font-weight="700" fill="${accent}">${count(profile.elo)} <tspan font-size="18">ELO</tspan></text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="450" viewBox="0 0 900 450" role="img" aria-label="Ranked World player card"><defs>${font?`<style>@font-face{font-family:CardFont;src:url(${font});font-weight:100 900}</style>`:''}<linearGradient id="background" x2="1" y2="1">${colors.map((color,i)=>`<stop offset="${i/(colors.length-1)}" stop-color="${color}"/>`).join('')}</linearGradient><clipPath id="card"><rect width="900" height="450" rx="24"/></clipPath><clipPath id="avatar"><circle cx="96" cy="170" r="49"/></clipPath></defs><g clip-path="url(#card)"><rect width="900" height="450" fill="url(#background)"/>${scenery(card.pattern,accent)}<rect width="900" height="450" fill="#05070d" opacity=".17"/><rect x="1" y="1" width="898" height="448" rx="23" fill="none" stroke="${accent}" stroke-opacity=".35"/><path d="M36 78H864M36 286H864" stroke="#fff" stroke-opacity=".1"/><g font-family="${option('font').family}"><text x="38" y="47" font-family="Arial,sans-serif" font-size="12" font-weight="700" letter-spacing="3" fill="#e4e8ef">RANKED WORLD</text><text x="860" y="47" text-anchor="end" font-family="Arial,sans-serif" font-size="11" letter-spacing="2" fill="${accent}">PLAYER CARD</text><circle cx="96" cy="170" r="54" stroke="${accent}" stroke-width="2" fill="#11151c"/>${avatar?`<image x="47" y="121" width="98" height="98" href="${avatar}" clip-path="url(#avatar)" preserveAspectRatio="xMidYMid slice"/>`:'<g fill="#8993a0"><circle cx="96" cy="158" r="15"/><path d="M69 197a27 24 0 0 1 54 0z"/></g>'}<text x="172" y="144" font-size="${Math.min(36,Math.max(12,330/Math.max(1,rawName.length)))}" font-weight="700" fill="#fff">${name}</text><text x="173" y="174" font-family="Arial,sans-serif" font-size="${Math.min(17,450/Math.max(1,String(profile.gameName||'').length))}" fill="#c2cbd7">${gameName}</text><text x="173" y="224" font-size="24" font-weight="700" fill="${accent}">${rank}</text><text x="173" y="248" font-family="Arial,sans-serif" font-size="12" fill="#c2cbd7">${profile.isTop?'Top division':`${percent}% to next division`}</text><circle cx="616" cy="174" r="56" fill="#0c1018" fill-opacity=".3" stroke="#ffffff20" stroke-width="4"/><circle cx="616" cy="174" r="56" fill="none" stroke="${accent}" stroke-width="4" stroke-linecap="round" stroke-dasharray="${percent*3.519} 352" transform="rotate(-90 616 174)"/>${badge?`<image x="575" y="133" width="82" height="82" href="${badge}"/>`:`<path d="M616 145l25 18-9 30h-32l-9-30z" fill="none" stroke="${accent}" stroke-width="3"/>`}<text x="858" y="139" text-anchor="end" font-family="Arial,sans-serif" font-size="11" letter-spacing="2" fill="#c2cbd7">GLOBAL RANK</text><text x="858" y="182" text-anchor="end" font-size="${String(profile.position||'').length>5?26:36}" font-weight="700" fill="#fff">${profile.position>0?'#'+count(profile.position):'Unranked'}</text><text x="858" y="213" text-anchor="end" font-family="Arial,sans-serif" font-size="12" fill="#c2cbd7">${count(profile.winStreak)} win streak</text>${tiles}<text x="860" y="430" text-anchor="end" font-family="Arial,sans-serif" font-size="12" letter-spacing=".6" fill="#c2cbd7">rankedworld.com</text></g></g></svg>`;
}
