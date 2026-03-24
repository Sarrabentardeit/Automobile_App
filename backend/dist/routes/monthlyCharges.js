"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// Petit helper pour erreurs de Prisma Client non généré
function ensureMonthlyChargeModel() {
    if (!prisma.monthlyCharge) {
        throw new Error("Prisma client n'est pas à jour pour MonthlyCharge. Arrête le backend, exécute `cd backend` puis `npx prisma generate`, puis relance le serveur.");
    }
}
router.use((0, auth_1.authenticate)());
// GET /charges-mensuelles
router.get('/', async (_req, res) => {
    try {
        ensureMonthlyChargeModel();
        const charges = await prisma.monthlyCharge.findMany({
            orderBy: { name: 'asc' },
        });
        res.json(charges);
    }
    catch (err) {
        console.error('Error fetching monthly charges', err);
        res.status(500).json({ message: 'Erreur lors du chargement des charges mensuelles.' });
    }
});
// POST /charges-mensuelles
router.post('/', async (req, res) => {
    try {
        ensureMonthlyChargeModel();
        const { name, amount } = req.body;
        const charge = await prisma.monthlyCharge.create({
            data: {
                name: String(name ?? ''),
                amount: Number(amount ?? 0),
            },
        });
        res.status(201).json(charge);
    }
    catch (err) {
        console.error('Error creating monthly charge', err);
        res.status(500).json({ message: 'Erreur lors de la création de la charge mensuelle.' });
    }
});
// PUT /charges-mensuelles/:id
router.put('/:id', async (req, res) => {
    try {
        ensureMonthlyChargeModel();
        const id = Number(req.params.id);
        const { name, amount } = req.body;
        const updated = await prisma.monthlyCharge.update({
            where: { id },
            data: {
                name: String(name ?? ''),
                amount: Number(amount ?? 0),
            },
        });
        res.json(updated);
    }
    catch (err) {
        console.error('Error updating monthly charge', err);
        res.status(500).json({ message: 'Erreur lors de la mise à jour de la charge mensuelle.' });
    }
});
// DELETE /charges-mensuelles/:id
router.delete('/:id', async (req, res) => {
    try {
        ensureMonthlyChargeModel();
        const id = Number(req.params.id);
        await prisma.monthlyCharge.delete({
            where: { id },
        });
        res.status(204).send();
    }
    catch (err) {
        console.error('Error deleting monthly charge', err);
        res.status(500).json({ message: 'Erreur lors de la suppression de la charge mensuelle.' });
    }
});
exports.default = router;
