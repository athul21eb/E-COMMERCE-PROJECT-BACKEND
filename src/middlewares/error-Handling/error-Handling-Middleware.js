const notFoundRoute = (req, res, next) => {
  const error = new Error(
    `Not found the Page-   ${req.originalUrl} with  ${req.method} request method `
  );

  res.status(404);

  next(error);
};

const errorHandler = (err, req, res, next) => {
  if (process.env.NODE_ENV === "development") console.log(err);

  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = err.message || "internal Server Error";

  if (err.name === "CastError" && err.kind === "ObjectId") {
    statusCode = 404;
    message = "Resource not found";
  }

  if (err.code === 11000) {
    statusCode = 400;
    message = message || "Email   already in use ";
  }

  if (err.name === "ValidationError") {
    statusCode = 400;
    message = Object.values(err?.errors).map((errr) => errr?.message)?.[0];
  }

  res.status(statusCode).json({
    message: message,
    stack: process.env.NODE_ENV === "development" && (err.stack || err),
  });
};

export { errorHandler, notFoundRoute };
