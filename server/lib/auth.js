// JWT auth + role-based access control middleware (BRD §5 / architecture §8).
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev-only-secret-change-me";
// AE-18: was a hardcoded 12h, which routinely went stale for a business
// used across a full working day (or checked again the next day) --
// once expired, every API call 401'd and every list in the app silently
// rendered empty, indistinguishable from actual data loss. Confirmed
// default of 7 days, overridable via env if the business wants shorter
// sessions -- not a hardcoded assumption baked in.
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

export function signToken(user) {
  return jwt.sign(
    { sub: user.id, name: user.name, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Missing bearer token" });
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

// Usage: requireRole("ADMIN", "BILLING")
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Insufficient role for this action" });
    }
    next();
  };
}
