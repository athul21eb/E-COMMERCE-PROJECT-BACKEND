
import {Router} from 'express'
import { getAllReturnOrders, ReturnOrderConfirm } from '../../../controllers/admin/returnOrders/return-orders-controllers.js';


const ReturnOrderRouter = Router();


ReturnOrderRouter.get("/",getAllReturnOrders);
ReturnOrderRouter.patch("/:orderId/items/:itemId/confirm",ReturnOrderConfirm);




export default ReturnOrderRouter