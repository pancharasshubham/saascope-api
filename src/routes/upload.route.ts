import { Router } from "express";
import { handleUpload } from "../controllers/upload.controller";
import { upload } from "../middlewares/upload.middleware";

const router = Router();

router.post("/", (req, res, next) => {
  console.log("UPLOAD ROUTE HIT");
  next();
}, upload.single("file"), handleUpload);

export default router;