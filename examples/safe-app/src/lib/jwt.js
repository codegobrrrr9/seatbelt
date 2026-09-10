import jwt from 'jsonwebtoken';

export function sign(payload) {
  return jwt.sign(payload, process.env.JWT_PRIVATE_KEY, { algorithm: 'RS256' });
}
