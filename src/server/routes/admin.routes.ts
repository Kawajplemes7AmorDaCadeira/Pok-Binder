import { Router } from 'express';
import { AdminController } from '../controllers/adminController';

export const adminRouter = Router();

// Validate catalog integrity
adminRouter.get('/validate-catalog', AdminController.validateCatalog);
