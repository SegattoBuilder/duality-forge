// Cloudflare Web Analytics — shared across all pages
const s = document.createElement('script');
s.type = 'module';
s.src = 'https://static.cloudflareinsights.com/beacon.min.js';
s.setAttribute('data-cf-beacon', '{"token": "5e91a5c1ba154ac3aac372aa0d198474"}');
document.head.appendChild(s);
