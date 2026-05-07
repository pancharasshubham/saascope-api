import { Router } from "express";
import { getReport } from "../controllers/report.controller";

const router = Router();

router.get("/:id", getReport);

export default router;