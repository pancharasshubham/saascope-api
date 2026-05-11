import { Router } from "express";
import { getReport, listReports } from "../controllers/report.controller";
import { authenticate } from "../middlewares/auth.middleware";

const router = Router();

// ---------- List user reports ----------
router.get(
  "/",
  authenticate,
  listReports
);


// ---------- Get report by id ----------
router.get( 
    "/:id", 
    authenticate, 
    getReport);

export default router;