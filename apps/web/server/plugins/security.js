import{createHash}from'node:crypto';
export default defineNitroPlugin(app=>{
app.hooks.hook('render:response',response=>{
if(typeof response.body!=='string'||!response.headers?.['content-type']?.includes('text/html'))return;
const hashes=new Set();
for(const match of response.body.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi))if(match[1])hashes.add("'sha256-"+createHash('sha256').update(match[1]).digest('base64')+"'");
response.headers['content-security-policy']="default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self' https://discord.com; script-src 'self' https://js.stripe.com "+[...hashes].join(' ')+"; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://cdn.discordapp.com https://media.discordapp.net; font-src 'self'; connect-src 'self' https://*.stripe.com https://*.stripe.network; frame-src https://js.stripe.com https://hooks.stripe.com; upgrade-insecure-requests";
delete response.headers['x-powered-by'];
});
});
