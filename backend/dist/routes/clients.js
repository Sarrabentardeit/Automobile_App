"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const db = prisma_1.prisma;
function toClient(c) {
    return {
        id: c.id,
        nom: c.nom,
        telephone: c.telephone,
        email: c.email ?? undefined,
        adresse: c.adresse ?? undefined,
        notes: c.notes ?? undefined,
        matriculeFiscale: c.matricule_fiscale ?? undefined,
    };
}
// GET /clients/stats - statistiques
router.get('/stats', (0, auth_1.authenticate)(), async (_req, res) => {
    try {
        const total = await db.client.count();
        return res.json({ total });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
// GET /clients - liste avec recherche et pagination
router.get('/', (0, auth_1.authenticate)(), async (req, res) => {
    try {
        const q = req.query.q?.trim();
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
        const where = q
            ? {
                OR: [
                    { nom: { contains: q, mode: 'insensitive' } },
                    { telephone: { contains: q, mode: 'insensitive' } },
                    { email: { contains: q, mode: 'insensitive' } },
                    { adresse: { contains: q, mode: 'insensitive' } },
                ],
            }
            : undefined;
        const [list, total] = await Promise.all([
            db.client.findMany({
                where,
                orderBy: { nom: 'asc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            db.client.count({ where }),
        ]);
        return res.json({
            data: list.map(toClient),
            total,
            page,
            limit,
        });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
// GET /clients/:id - détail
router.get('/:id', (0, auth_1.authenticate)(), async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (isNaN(id))
            return res.status(400).json({ error: 'ID invalide' });
        const c = await db.client.findUnique({ where: { id } });
        if (!c)
            return res.status(404).json({ error: 'Client introuvable' });
        return res.json(toClient(c));
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
// POST /clients - créer
router.post('/', (0, auth_1.authenticate)(), async (req, res) => {
    try {
        const body = req.body;
        if (!body.nom?.trim())
            return res.status(400).json({ error: 'nom est requis' });
        if (!body.telephone?.trim())
            return res.status(400).json({ error: 'telephone est requis' });
        const c = await db.client.create({
            data: {
                nom: body.nom.trim(),
                telephone: body.telephone.trim(),
                email: (body.email ?? '').trim() || null,
                adresse: (body.adresse ?? '').trim() || null,
                notes: (body.notes ?? '').trim() || null,
                matricule_fiscale: (body.matriculeFiscale ?? '').trim() || null,
            },
        });
        return res.status(201).json(toClient(c));
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
// PUT /clients/:id - modifier
router.put('/:id', (0, auth_1.authenticate)(), async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (isNaN(id))
            return res.status(400).json({ error: 'ID invalide' });
        const body = req.body;
        const existing = await db.client.findUnique({ where: { id } });
        if (!existing)
            return res.status(404).json({ error: 'Client introuvable' });
        const c = await db.client.update({
            where: { id },
            data: {
                ...(body.nom !== undefined && { nom: body.nom.trim() }),
                ...(body.telephone !== undefined && { telephone: body.telephone.trim() }),
                ...(body.email !== undefined && { email: (body.email ?? '').trim() || null }),
                ...(body.adresse !== undefined && { adresse: (body.adresse ?? '').trim() || null }),
                ...(body.notes !== undefined && { notes: (body.notes ?? '').trim() || null }),
                ...(body.matriculeFiscale !== undefined && {
                    matricule_fiscale: (body.matriculeFiscale ?? '').trim() || null,
                }),
            },
        });
        return res.json(toClient(c));
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
// DELETE /clients/:id - supprimer
router.delete('/:id', (0, auth_1.authenticate)(), async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (isNaN(id))
            return res.status(400).json({ error: 'ID invalide' });
        const existing = await db.client.findUnique({ where: { id } });
        if (!existing)
            return res.status(404).json({ error: 'Client introuvable' });
        await db.client.delete({ where: { id } });
        return res.status(204).send();
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
