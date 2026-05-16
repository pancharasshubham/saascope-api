import { Router } from "express";
import { getReport, listReports, retryReport } from "../controllers/report.controller";
import { authenticate } from "../middlewares/auth.middleware";

const router = Router();

// ---------- List user reports ----------
router.get(
  "/",
  authenticate,
  listReports
);

router.post(
  "/:id/retry",
  authenticate,
  retryReport
);


// ---------- Get report by id ----------
router.get( 
    "/:id", 
    authenticate, 
    getReport);

export default router;