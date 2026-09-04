import { Router, type IRouter } from "express";
import healthRouter from "./health";
import stockRouter from "./stock";
import presenceRouter from "./presence";

const router: IRouter = Router();

router.use(healthRouter);
router.use(stockRouter);
router.use(presenceRouter);

export default router;
