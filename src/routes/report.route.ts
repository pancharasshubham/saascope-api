import { Router } from "express";
import { getReport, getReportEvents, listReports, retryReport } from "../controllers/report.controller";
import { authenticate } from "../middlewares/auth.middleware";

const router = Router();

// ---------- List user reports ----------
router.get(
  "/",
  authenticate,
  listReports
);

router.get(
  "/:id/events",
  authenticate,
  getReportEvents
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

// ---------- Delete report ----------
import { deleteReport } from "../controllers/report.controller";
router.delete(
  "/:id",
  authenticate,
  deleteReport
);

export default router;