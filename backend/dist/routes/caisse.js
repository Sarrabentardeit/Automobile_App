"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const teamMoneyMigrate_1 = require("../lib/teamMoneyMigrate");
const router = (0, express_1.Router)();
function isAdmin(req) {
    return req.user?.role === 'admin';
}
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
        const users = await (0, teamMoneyMigrate_1.loadUsersForTeamMoneyMigration)();
        const { days: migrated, changed } = (0, teamMoneyMigrate_1.migrateTeamMoneyDaysWithUsers)(data, users);
        if (changed) {
            await prisma_1.prisma.teamMoneyState.update({
                where: { id: 1 },
                data: { data: migrated },
            });
        }
        return res.json({ data: migrated, updatedAt: state.updatedAt.toISOString() });
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
// POST /caisse/repair — admin: force re-link legacy name columns to user ids
router.post('/repair', (0, auth_1.authenticate)(), async (req, res) => {
    if (!isAdmin(req)) {
        return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
    }
    try {
        const result = await (0, teamMoneyMigrate_1.repairTeamMoneyState)();
        const state = await prisma_1.prisma.teamMoneyState.findUnique({ where: { id: 1 } });
        return res.json({
            ...result,
            data: state?.data ?? [],
            updatedAt: state?.updatedAt?.toISOString() ?? null,
        });
    }
    catch (err) {
        console.error(err);
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
        const users = await (0, teamMoneyMigrate_1.loadUsersForTeamMoneyMigration)();
        const { days: normalized } = (0, teamMoneyMigrate_1.migrateTeamMoneyDaysWithUsers)(days, users);
        const now = new Date();
        const state = await prisma_1.prisma.teamMoneyState.upsert({
            where: { id: 1 },
            update: { data: normalized, updatedAt: now },
            create: { id: 1, data: normalized, updatedAt: now },
        });
        return res.json({ data: state.data, updatedAt: state.updatedAt.toISOString() });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
