const { OAuth2Client } = require('google-auth-library');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const verifyGoogleToken = async (idToken) => {
  if (process.env.NODE_ENV === 'development' && idToken === 'dev-mock-token') {
    return {
      googleId: 'dev-google-id',
      email: 'dev.user@gmail.com',
      name: 'Dev User',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&h=120&fit=crop',
    };
  }

  if (!process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID.includes('your-google')) {
    throw new Error('GOOGLE_CLIENT_ID not configured. Use dev-mock-token in development.');
  }

  const ticket = await client.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  return {
    googleId: payload.sub,
    email: payload.email,
    name: payload.name,
    avatar: payload.picture,
  };
};

module.exports = { verifyGoogleToken };
