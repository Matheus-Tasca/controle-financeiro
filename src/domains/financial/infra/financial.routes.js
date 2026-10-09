import express from 'express';
import { CardController } from './controllers/CardController.js';
import { TransactionController } from './controllers/TransactionController.js';
import { EntryCategoryController } from './controllers/EntryCategoryController.js';
import { PaymentMethodController } from './controllers/PaymentMethodController.js';
import { authenticationMiddleware } from '../../../shared/infra/auth/authenticationMiddleware.js';

const financialRouter = express.Router();
financialRouter.use(authenticationMiddleware);
const cardController = new CardController();
const transactionController = new TransactionController();
const entryCategoryController = new EntryCategoryController();
const paymentMethodController = new PaymentMethodController();

financialRouter.post('/cards', (req, res) =>
  cardController.createCard(req, res)
);
financialRouter.put('/cards/:id', (req, res) =>
  cardController.updateCard(req, res)
);
financialRouter.delete('/cards/:id', (req, res) =>
  cardController.deleteCard(req, res)
);
financialRouter.get('/cards', (req, res) =>
  cardController.getAllCards(req, res)
);

financialRouter.post('/transactions', (req, res) =>
  transactionController.createTransaction(req, res)
);
financialRouter.put('/transactions/:id', (req, res) =>
  transactionController.updateTransaction(req, res)
);
financialRouter.delete('/transactions/:id', (req, res) =>
  transactionController.deleteTransaction(req, res)
);

financialRouter.get('/dashboard', (req, res) => {
  transactionController.getDashboard(req, res);
});
financialRouter.get('/dashboard/top-categories', (req, res) =>
  transactionController.getTopCategories(req, res)
);
financialRouter.get('/transactions/statement', (req, res) =>
  transactionController.getStatement(req, res)
);
financialRouter.get('/payment-methods', (req, res) =>
  paymentMethodController.getActivePaymentMethods(req, res)
);

financialRouter.post('/entryCategory', (req, res) =>
  entryCategoryController.createEntryCategory(req, res)
);
financialRouter.put('/entryCategory/:id', (req, res) =>
  entryCategoryController.updateEntryCategory(req, res)
);
financialRouter.delete('/entryCategory/:id', (req, res) =>
  entryCategoryController.deleteEntryCategory(req, res)
);
financialRouter.get('/entryCategory', (req, res) =>
  entryCategoryController.getAllEntryCategories(req, res)
);

export default financialRouter;
