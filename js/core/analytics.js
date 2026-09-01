// Cloudflare Web Analytics — shared across all pages
const s = document.createElement('script');
s.type = 'module';
s.src = 'https://static.cloudflareinsights.com/beacon.min.js';
s.setAttribute('data-cf-beacon', '{"token": "3eabada164064538b3bf93b67c7ac3e0"}');
document.head.appendChild(s);
