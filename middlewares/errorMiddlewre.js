// middlewares/errorMiddleware.js
export function errorHandler(err, req, res, next) {
  console.error(err);

  // prefer an explicit statusCode on the error (err.statusCode)
  const statusCode = err.statusCode || (res.statusCode && res.statusCode !== 200 ? res.statusCode : 500);
  res.status(statusCode);

  const payload = {
    message: err.message || "Server error",
  };

  // include stack trace only in development for debugging
  if (process.env.NODE_ENV === "development") {
    payload.stack = err.stack;
  }

  res.json(payload);
}
