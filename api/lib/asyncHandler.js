// Express 4 doesn't await async route handlers, so a rejected promise inside
// one (e.g. a Prisma error) becomes an unhandled rejection: the request just
// hangs with no response instead of surfacing a 500. Wrap every async
// handler with this so errors always reach the error-handling middleware.
export function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}
