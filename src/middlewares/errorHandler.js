function errorHandler(err, req, res, next) {
  console.error('API Error:', err);

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Terjadi kesalahan internal pada server.',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
}

export default errorHandler;
export { errorHandler };
