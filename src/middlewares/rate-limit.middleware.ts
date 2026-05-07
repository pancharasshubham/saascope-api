import rateLimit from "express-rate-limit";

export const uploadRateLimiter = rateLimit({
  windowMs:  60 * 1000,

  max: 3,

  standardHeaders: true,

  legacyHeaders: false,

 handler: (req, res) => {
    console.log("RATE LIMIT HIT");

    res.status(429).json({
      error:
        "Too many upload requests. Please try again later.",
    });
  },
});