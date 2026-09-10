import jwt from 'jsonwebtoken';

const PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCfixturenotarealkey
0000000000000000000000000000000000000000000000000000000000000000
-----END PRIVATE KEY-----`;

export function sign(payload) {
  return jwt.sign(payload, PRIVATE_KEY, { algorithm: 'RS256' });
}
