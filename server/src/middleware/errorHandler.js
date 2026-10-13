export function errorHandler(err, req, res, next) {
  console.error(`[Error] ${req.method} ${req.originalUrl}:`, err.message);

  const status = err.status || err.statusCode || 500;
  const code = err.code || 'INTERNAL_ERROR';

  let message = err.message || 'An unexpected error occurred. Please try again.';
  if (status === 500 && process.env.NODE_ENV === 'production') {
    message = 'An unexpected server error occurred. Please try again shortly.';
  }

  res.status(status).json({
    success: false,
    error: {
      code,
      message,
    },
  });
}
