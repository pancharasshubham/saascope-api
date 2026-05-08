import { Router } from "express";
import { getReport } from "../controllers/report.controller";
import { authenticate }
from "../middlewares/auth.middleware";

const router = Router();

router.get(
    "/:id", 
    authenticate, 
    getReport);

export default router;