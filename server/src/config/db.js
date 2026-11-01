import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Mask credentials in MongoDB connection string for safe console logging
 */
export const sanitizeMongoUri = (uri = '') => {
  if (!uri) return '';
  return uri.replace(/\/\/(.*):(.*)@/, '//$1:****@');
};

/**
 * Establish mandatory MongoDB connection
 * Throws on failure to prevent starting server without persistent storage
 */
export const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    const errorMsg = 'MONGO_URI is missing from environment configuration (server/.env).';
    console.error(`[MongoDB Error]: ${errorMsg}`);
    throw new Error(errorMsg);
  }

  const sanitized = sanitizeMongoUri(mongoUri);

  try {
    console.log(`[MongoDB]: Attempting connection to ${sanitized}...`);
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000 // 5 seconds timeout
    });

    console.log(`[MongoDB Connected]: Host=${conn.connection.host} | Database=${conn.connection.name} | Port=${conn.connection.port || 'Atlas Default'}`);
    return conn;
  } catch (error) {
    console.error(`[MongoDB Connection Failed]: Unable to connect to ${sanitized}`);
    console.error(`[MongoDB Error Reason]: ${error.name} - ${error.message}`);
    throw error;
  }
};
