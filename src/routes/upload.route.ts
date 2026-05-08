import { Router } from "express";
import { handleUpload } from "../controllers/upload.controller";
import { upload } from "../middlewares/upload.middleware";
import { uploadRateLimiter } from "../middlewares/rate-limit.middleware"; 
import { authenticate }
from "../middlewares/auth.middleware";

const router = Router();

router.post(
  "/", 
  authenticate,
  uploadRateLimiter, 
  upload.single("file"), 
  handleUpload
);

export default router;