import rateLimit from "express-rate-limit";

export const uploadRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes

  max: 20, // limit each IP to 20 requests per windowMs

  standardHeaders: true, 

  legacyHeaders: false,

  skipSuccessfulRequests: false, //count all requests, even successful ones

  message: {
    error:
      "Too many upload requests. Please try again later.",
    retryAfter: "15 minutes",
  },
});