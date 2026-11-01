import jwt from 'jsonwebtoken';

export const generateToken = (userId) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not defined');
  }

  return jwt.sign(
    { id: userId },
    secret,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
};
