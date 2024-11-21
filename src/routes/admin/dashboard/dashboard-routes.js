

import {Router} from 'express'
import { getDashboardData, getBarGraphData, getPieChartData } from '../../../controllers/admin/dashboard/dashboard-controllers.js';


const DashBoardRouter = Router();



DashBoardRouter.get("/summary",getDashboardData);
DashBoardRouter.get("/bar-graph",getBarGraphData);
DashBoardRouter.get("/pie-chart",getPieChartData)



export default DashBoardRouter;