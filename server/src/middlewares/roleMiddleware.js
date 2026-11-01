import { errorResponse } from '../utils/apiResponse.js';

export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return errorResponse(
        res,
        `Access denied: Role '${req.user?.role || 'Guest'}' is not authorized to access this resource`,
        403
      );
    }
    next();
  };
};
