import 'dotenv/config';

const base64Cookie = process.argv[2];
if (!base64Cookie) {
  console.error('Usage: node test-decode-cookie.mjs <cookie_value>');
  process.exit(1);
}

const decoded = Buffer.from(base64Cookie.replace('base64-', ''), 'base64').toString('utf8');
console.log(decoded);
