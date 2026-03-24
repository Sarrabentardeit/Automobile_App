"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
function toTeamMember(r) {
    return {
        id: r.id,
        name: r.name,
        phone: r.phone,
    };
}
// GET /team-members - liste
router.get('/', (0, auth_1.authenticate)(), async (_req, res) => {
    try {
        const list = (await prisma_1.prisma.teamMember.findMany({
            orderBy: [{ name: 'asc' }],
        }));
        return res.json(list.map(toTeamMember));
    }
    catch (err) {
        console.error(err);
        if (typeof prisma_1.prisma.teamMember === 'undefined') {
            return res.status(500).json({
                error: 'Backend: exécutez "npx prisma generate" puis redémarrez le serveur.',
            });
        }
        return res.status(500).json({ error: 'Internal server error' });
    }
});
// POST /team-members - créer
router.post('/', (0, auth_1.authenticate)(), async (req, res) => {
    try {
        const body = req.body;
        if (!body.name?.trim())
            return res.status(400).json({ error: 'name est requis' });
        const created = (await prisma_1.prisma.teamMember.create({
            data: {
                name: body.name.trim(),
                phone: (body.phone ?? '').trim(),
            },
        }));
        return res.status(201).json(toTeamMember(created));
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
// PUT /team-members/:id - mise à jour
router.put('/:id', (0, auth_1.authenticate)(), async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (isNaN(id))
            return res.status(400).json({ error: 'ID invalide' });
        const existing = await prisma_1.prisma.teamMember.findUnique({ where: { id } });
        if (!existing)
            return res.status(404).json({ error: 'Membre introuvable' });
        const body = req.body;
        if (body.name !== undefined && !body.name.trim()) {
            return res.status(400).json({ error: 'name ne peut pas être vide' });
        }
        const updated = (await prisma_1.prisma.teamMember.update({
            where: { id },
            data: {
                ...(body.name !== undefined && { name: body.name.trim() }),
                ...(body.phone !== undefined && { phone: body.phone.trim() }),
            },
        }));
        return res.json(toTeamMember(updated));
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
// DELETE /team-members/:id - suppression
router.delete('/:id', (0, auth_1.authenticate)(), async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (isNaN(id))
            return res.status(400).json({ error: 'ID invalide' });
        const existing = await prisma_1.prisma.teamMember.findUnique({ where: { id } });
        if (!existing)
            return res.status(404).json({ error: 'Membre introuvable' });
        await prisma_1.prisma.teamMember.delete({ where: { id } });
        return res.status(204).send();
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
