import express from 'express';
import { CardController } from './controllers/CardController.js';
import { TransactionController } from './controllers/TransactionController.js';
import { EntryCategoryController } from './controllers/EntryCategoryController.js';
import { PaymentMethodController } from './controllers/PaymentMethodController.js';
import { ThirdPartyController } from './controllers/ThirdPartyController.js';
import { ThirdPartyDebtController } from './controllers/ThirdPartyDebtController.js';
import { authenticationMiddleware } from '../../../shared/infra/auth/authenticationMiddleware.js';

const financialRouter = express.Router();
financialRouter.use(authenticationMiddleware);
const cardController = new CardController();
const transactionController = new TransactionController();
const entryCategoryController = new EntryCategoryController();
const paymentMethodController = new PaymentMethodController();
const thirdPartyController = new ThirdPartyController();
const thirdPartyDebtController = new ThirdPartyDebtController();

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

// Terceiros (A Pagar e A Receber)
financialRouter.get('/third-parties', (req, res) =>
  thirdPartyController.getAllThirdParties(req, res)
);
financialRouter.post('/third-parties', (req, res) =>
  thirdPartyController.createThirdParty(req, res)
);
financialRouter.put('/third-parties/:id', (req, res) =>
  thirdPartyController.updateThirdParty(req, res)
);
financialRouter.delete('/third-parties/:id', (req, res) =>
  thirdPartyController.deleteThirdParty(req, res)
);

// Lançamentos e Extrato de Terceiros
financialRouter.post('/third-party-debts', (req, res) =>
  thirdPartyDebtController.createDebt(req, res)
);
financialRouter.delete('/third-party-debts/:id', (req, res) =>
  thirdPartyDebtController.deleteDebt(req, res)
);
financialRouter.patch('/third-party-debts/installments/:id/payment', (req, res) =>
  thirdPartyDebtController.updateInstallmentPayment(req, res)
);
financialRouter.get('/third-party-debts/statement', (req, res) =>
  thirdPartyDebtController.getStatement(req, res)
);

export default financialRouter;
