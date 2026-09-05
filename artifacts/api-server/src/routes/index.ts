import { Router, type IRouter } from "express";
import healthRouter from "./health";
import stockRouter from "./stock";
import presenceRouter from "./presence";
import controlRouter from "./control";
import authRouter from "./auth";

const router: IRouter = Router();

router.use(healthRouter);
router.use(stockRouter);
router.use(presenceRouter);
router.use(controlRouter);
router.use(authRouter);

export default router;
