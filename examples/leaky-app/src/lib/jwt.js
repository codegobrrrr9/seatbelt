import jwt from 'jsonwebtoken';

const PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCYPOpi7OzPzQcz
2eGUlRvasI3sl13vNwf4bDY9rqG5I8xi5cAcoWZhBrO4O9QIZ2e48BnSUsR1TH57
RNxoJnWLzQQxIuYhjk1fI6XBKNchNa0zbnZ3iCyU7j8cSQ0i7bmEZslgcsoGZvHQ
-----END PRIVATE KEY-----`;

export function sign(payload) {
  return jwt.sign(payload, PRIVATE_KEY, { algorithm: 'RS256' });
}
