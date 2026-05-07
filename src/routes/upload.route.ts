import { Router } from "express";
import { handleUpload } from "../controllers/upload.controller";
import { upload } from "../middlewares/upload.middleware";
import { uploadRateLimiter } from "../middlewares/rate-limit.middleware"; 

const router = Router();

router.post(
  "/", 
  uploadRateLimiter, 
  upload.single("file"), 
  handleUpload
);

export default router;