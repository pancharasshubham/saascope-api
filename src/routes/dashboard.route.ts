import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware";
import { getDashboardSummary } from "../controllers/dashboard.controller";

const router = Router();

router.get(
  "/summary",
  authenticate,
  getDashboardSummary
);

export default router;