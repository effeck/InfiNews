import { BOT_CONFIG } from './config.js';

// Tracks which user IDs are admins. Populated from BOT_CONFIG.ADMIN_IDS.
// Helper so handlers can do `ctx.config.isAdmin(ctx.user?.user_id)`.
export const adminMiddleware = async (ctx, next) => {
  const userId = ctx.user?.user_id;
  ctx.config = {
    isAdmin(userIdToCheck) {
      if (!BOT_CONFIG.ADMIN_IDS.length) return false;
      return BOT_CONFIG.ADMIN_IDS.includes(Number(userIdToCheck));
    },
  };
  return next();
};
