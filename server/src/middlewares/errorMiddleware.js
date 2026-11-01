import { errorResponse } from '../utils/apiResponse.js';

export const errorHandler = (err, req, res, next) => {
  console.error(`[Error Handler]: ${err.stack || err.message}`);

  // Multer file size error
  if (err.code === 'LIMIT_FILE_SIZE') {
    return errorResponse(res, 'File too large. Maximum allowed size is 5 MB.', 400);
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return errorResponse(res, `Duplicate field value: ${field} already exists.`, 409);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((val) => val.message);
    return errorResponse(res, 'Validation error', 400, messages);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return errorResponse(res, 'Invalid token signature', 401);
  }
  if (err.name === 'TokenExpiredError') {
    return errorResponse(res, 'Token has expired', 401);
  }

  return errorResponse(
    res,
    err.message || 'Internal server error',
    err.statusCode || 500
  );
};
