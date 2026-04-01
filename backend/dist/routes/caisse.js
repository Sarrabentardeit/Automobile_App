"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// GET /caisse - renvoie le tableau complet des jours TeamMoneyDayEntry (JSON)
router.get('/', (0, auth_1.authenticate)(), async (_req, res) => {
    try {
        const state = await prisma_1.prisma.teamMoneyState.findUnique({ where: { id: 1 } });
        if (!state) {
            return res.json({ data: [], updatedAt: null });
        }
        const data = (state.data ?? []);
        if (!Array.isArray(data))
            return res.json({ data: [], updatedAt: state.updatedAt.toISOString() });
        return res.json({ data, updatedAt: state.updatedAt.toISOString() });
    }
    catch (err) {
        console.error(err);
        if (typeof prisma_1.prisma.teamMoneyState === 'undefined') {
            return res.status(500).json({
                error: 'Backend: exécutez "npx prisma generate" puis redémarrez le serveur.',
            });
        }
        return res.status(500).json({ error: 'Internal server error' });
    }
});
// PUT /caisse - remplace le tableau complet des jours
router.put('/', (0, auth_1.authenticate)(), async (req, res) => {
    try {
        const body = req.body;
        const isLegacyArray = Array.isArray(body);
        const days = isLegacyArray ? body : body.days;
        const expectedUpdatedAt = !isLegacyArray ? body.expectedUpdatedAt : undefined;
        if (!Array.isArray(days)) {
            return res.status(400).json({ error: 'Le corps doit contenir "days" (tableau)' });
        }
        const existing = await prisma_1.prisma.teamMoneyState.findUnique({ where: { id: 1 } });
        if (expectedUpdatedAt !== undefined && existing) {
            const current = existing.updatedAt.toISOString();
            if (expectedUpdatedAt !== current) {
                return res.status(409).json({ error: 'Conflit de version, rechargez les données caisse' });
            }
        }
        const now = new Date();
        const state = await prisma_1.prisma.teamMoneyState.upsert({
            where: { id: 1 },
            update: { data: days, updatedAt: now },
            create: { id: 1, data: days, updatedAt: now },
        });
        return res.json({ data: state.data, updatedAt: state.updatedAt.toISOString() });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
