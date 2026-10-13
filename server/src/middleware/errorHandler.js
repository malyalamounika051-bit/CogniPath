export function errorHandler(err, req, res, next) {
  console.error(`[Error] ${req.method} ${req.originalUrl}:`, err.message);

  const status = err.status || err.statusCode || 500;
  const code = err.code || 'INTERNAL_ERROR';

  const message = err.message || 'An unexpected error occurred. Please try again.';

  res.status(status).json({
    success: false,
    error: {
      code,
      message,
    },
  });
}
