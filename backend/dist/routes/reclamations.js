"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const db = prisma_1.prisma;
// Vérifier que le modèle Reclamation existe (client Prisma régénéré après migration)
if (typeof db.reclamation === 'undefined') {
    console.error('[reclamations] Le modèle Prisma Reclamation est absent. Exécutez "npx prisma generate" (avec le serveur backend arrêté), puis redémarrez le serveur.');
}
const STATUTS = ['ouverte', 'en_cours', 'traitee', 'cloturee'];
const PRIORITES = ['basse', 'normale', 'haute'];
function toReclamation(r) {
    return {
        id: r.id,
        date: r.date,
        clientName: r.client_name,
        clientTelephone: r.client_telephone ?? undefined,
        vehicleRef: r.vehicle_ref,
        sujet: r.sujet,
        description: r.description,
        statut: r.statut,
        assigneA: r.assigne_a ?? undefined,
        priorite: r.priorite ?? undefined,
        techniciens: r.techniciens?.map(t => t.user_full_name) ?? [],
    };
}
/** Crée une notification pour une liste de techniciens (par nom complet) */
async function notifyAssignees(reclamationId, names, sujet) {
    const cleaned = Array.from(new Set(names
        .map(n => n.trim())
        .filter(Boolean)
        .map(n => n.toLocaleLowerCase())));
    if (!cleaned.length)
        return;
    try {
        if (typeof prisma_1.prisma.notification === 'undefined')
            return;
        const users = await prisma_1.prisma.user.findMany({
            where: {
                statut: 'actif',
                OR: cleaned.map(n => ({ fullName: { equals: n, mode: 'insensitive' } })),
            },
            select: { id: true },
        });
        const title = 'Réclamation assignée';
        const message = sujet ? `Vous avez été assigné à la réclamation : ${sujet}` : 'Une réclamation vous a été assignée.';
        const uniqueUserIds = Array.from(new Set(users.map(u => u.id)));
        for (const userId of uniqueUserIds) {
            await prisma_1.prisma.notification.create({
                data: {
                    userId,
                    type: 'reclamation_assigned',
                    reclamationId,
                    title,
                    message,
                },
            });
        }
    }
    catch (e) {
        console.error('[reclamations] notifyAssignee:', e);
    }
}
// GET /reclamations - liste avec recherche, filtre statut et gestion des droits
router.get('/', (0, auth_1.authenticate)(), async (req, res) => {
    try {
        const q = req.query.q?.trim();
        const statut = req.query.statut?.trim();
        const where = {};
        if (q) {
            where.OR = [
                { client_name: { contains: q, mode: 'insensitive' } },
                { client_telephone: { contains: q } },
                { vehicle_ref: { contains: q, mode: 'insensitive' } },
                { sujet: { contains: q, mode: 'insensitive' } },
                { description: { contains: q, mode: 'insensitive' } },
            ];
        }
        if (statut && STATUTS.includes(statut)) {
            where.statut = statut;
        }
        // Gestion des droits :
        // - admin / responsable / financier : voient toutes les réclamations
        // - technicien : uniquement celles qui lui sont assignées (responsable ou dans la liste des techniciens)
        const role = req.user?.role;
        const fullName = req.user?.fullName;
        if (role === 'technicien' && fullName) {
            const andConditions = where.AND ?? [];
            andConditions.push({
                OR: [
                    { assigne_a: { equals: fullName, mode: 'insensitive' } },
                    {
                        techniciens: {
                            some: { user_full_name: { equals: fullName, mode: 'insensitive' } },
                        },
                    },
                ],
            });
            where.AND = andConditions;
        }
        const list = (await prisma_1.prisma.reclamation.findMany({
            where: Object.keys(where).length ? where : undefined,
            orderBy: [{ date: 'desc' }, { id: 'desc' }],
            include: { techniciens: true },
        }));
        return res.json(list.map(toReclamation));
    }
    catch (err) {
        console.error(err);
        const message = db.reclamation === undefined
            ? 'Backend: exécutez "npx prisma generate" puis redémarrez le serveur.'
            : err instanceof Error ? err.message : 'Internal server error';
        return res.status(500).json({ error: message });
    }
});
// GET /reclamations/:id - détail (avec gestion des droits)
router.get('/:id', (0, auth_1.authenticate)(), async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (isNaN(id))
            return res.status(400).json({ error: 'ID invalide' });
        const r = (await prisma_1.prisma.reclamation.findUnique({
            where: { id },
            include: { techniciens: true },
        }));
        if (!r)
            return res.status(404).json({ error: 'Réclamation introuvable' });
        const role = req.user?.role;
        const fullName = req.user?.fullName;
        if (role === 'technicien' && fullName) {
            const assigned = (r.assigne_a ?? '').toLocaleLowerCase();
            const others = (r.techniciens ?? []).map(t => t.user_full_name.toLocaleLowerCase());
            const me = fullName.toLocaleLowerCase();
            if (assigned !== me && !others.includes(me)) {
                return res.status(403).json({ error: 'Accès refusé à cette réclamation' });
            }
        }
        return res.json(toReclamation(r));
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
// POST /reclamations - créer
router.post('/', (0, auth_1.authenticate)(), async (req, res) => {
    try {
        const body = req.body;
        if (!body.clientName?.trim()) {
            return res.status(400).json({ error: 'clientName est requis' });
        }
        if (!body.date?.trim()) {
            return res.status(400).json({ error: 'date est requise' });
        }
        const statut = body.statut && STATUTS.includes(body.statut) ? body.statut : 'ouverte';
        const priorite = body.priorite && PRIORITES.includes(body.priorite) ? body.priorite : 'normale';
        const created = await prisma_1.prisma.$transaction(async (tx) => {
            const rec = await tx.reclamation.create({
                data: {
                    date: body.date.trim(),
                    client_name: body.clientName.trim(),
                    client_telephone: (body.clientTelephone ?? '').trim() || null,
                    vehicle_ref: (body.vehicleRef ?? '').trim(),
                    sujet: (body.sujet ?? '').trim(),
                    description: (body.description ?? '').trim(),
                    statut,
                    assigne_a: (body.assigneA ?? '').trim() || null,
                    priorite,
                },
            });
            const names = [
                body.assigneA ?? '',
                ...(Array.isArray(body.techniciens) ? body.techniciens : []),
            ];
            const uniqueNames = Array.from(new Set(names
                .map(n => n.trim())
                .filter(Boolean)));
            if (uniqueNames.length) {
                const users = await tx.user.findMany({
                    where: {
                        statut: 'actif',
                        OR: uniqueNames.map(n => ({ fullName: { equals: n, mode: 'insensitive' } })),
                    },
                    select: { id: true, fullName: true },
                });
                if (users.length) {
                    await tx.reclamationTechnicien.createMany({
                        data: users.map(u => ({
                            reclamationId: rec.id,
                            userId: u.id,
                            user_full_name: u.fullName,
                        })),
                    });
                }
            }
            return rec;
        });
        const allNames = [
            body.assigneA ?? '',
            ...(Array.isArray(body.techniciens) ? body.techniciens : []),
        ];
        await notifyAssignees(created.id, allNames, created.sujet ?? '');
        const withTechs = (await prisma_1.prisma.reclamation.findUnique({
            where: { id: created.id },
            include: { techniciens: true },
        }));
        return res.status(201).json(toReclamation(withTechs));
    }
    catch (err) {
        console.error(err);
        const message = db.reclamation === undefined
            ? 'Backend: exécutez "npx prisma generate" puis redémarrez le serveur.'
            : err instanceof Error ? err.message : 'Internal server error';
        return res.status(500).json({ error: message });
    }
});
// PUT /reclamations/:id - mise à jour
router.put('/:id', (0, auth_1.authenticate)(), async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (isNaN(id))
            return res.status(400).json({ error: 'ID invalide' });
        const body = req.body;
        const existing = await prisma_1.prisma.reclamation.findUnique({ where: { id }, include: { techniciens: true } });
        if (!existing)
            return res.status(404).json({ error: 'Réclamation introuvable' });
        if (body.clientName !== undefined && !body.clientName.trim()) {
            return res.status(400).json({ error: 'clientName ne peut pas être vide' });
        }
        if (body.date !== undefined && !body.date.trim()) {
            return res.status(400).json({ error: 'date ne peut pas être vide' });
        }
        const statut = body.statut && STATUTS.includes(body.statut) ? body.statut : undefined;
        const priorite = body.priorite && PRIORITES.includes(body.priorite) ? body.priorite : undefined;
        const updated = await prisma_1.prisma.$transaction(async (tx) => {
            const rec = await tx.reclamation.update({
                where: { id },
                data: {
                    ...(body.date !== undefined && { date: body.date.trim() }),
                    ...(body.clientName !== undefined && { client_name: body.clientName.trim() }),
                    ...(body.clientTelephone !== undefined && { client_telephone: (body.clientTelephone ?? '').trim() || null }),
                    ...(body.vehicleRef !== undefined && { vehicle_ref: (body.vehicleRef ?? '').trim() }),
                    ...(body.sujet !== undefined && { sujet: (body.sujet ?? '').trim() }),
                    ...(body.description !== undefined && { description: (body.description ?? '').trim() }),
                    ...(statut !== undefined && { statut }),
                    ...(body.assigneA !== undefined && { assigne_a: (body.assigneA ?? '').trim() || null }),
                    ...(priorite !== undefined && { priorite }),
                },
            });
            // Recalcul des techniciens associés
            if (body.techniciens !== undefined || body.assigneA !== undefined) {
                await tx.reclamationTechnicien.deleteMany({ where: { reclamationId: rec.id } });
                const names = [
                    body.assigneA ?? (existing?.assigne_a ?? ''),
                    ...(Array.isArray(body.techniciens) ? body.techniciens : existing?.techniciens?.map(t => t.user_full_name) ?? []),
                ];
                const uniqueNames = Array.from(new Set(names
                    .map(n => n.trim())
                    .filter(Boolean)));
                if (uniqueNames.length) {
                    const users = await tx.user.findMany({
                        where: {
                            statut: 'actif',
                            OR: uniqueNames.map(n => ({ fullName: { equals: n, mode: 'insensitive' } })),
                        },
                        select: { id: true, fullName: true },
                    });
                    if (users.length) {
                        await tx.reclamationTechnicien.createMany({
                            data: users.map(u => ({
                                reclamationId: rec.id,
                                userId: u.id,
                                user_full_name: u.fullName,
                            })),
                        });
                    }
                }
            }
            return rec;
        });
        const allNames = [
            body.assigneA ?? (existing?.assigne_a ?? ''),
            ...(Array.isArray(body.techniciens) ? body.techniciens : existing?.techniciens?.map(t => t.user_full_name) ?? []),
        ];
        await notifyAssignees(updated.id, allNames, updated.sujet ?? '');
        const withTechs = (await prisma_1.prisma.reclamation.findUnique({
            where: { id: updated.id },
            include: { techniciens: true },
        }));
        return res.json(toReclamation(withTechs));
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
// DELETE /reclamations/:id - suppression
router.delete('/:id', (0, auth_1.authenticate)(), async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (isNaN(id))
            return res.status(400).json({ error: 'ID invalide' });
        const existing = await db.reclamation.findUnique({ where: { id } });
        if (!existing)
            return res.status(404).json({ error: 'Réclamation introuvable' });
        await db.reclamation.delete({ where: { id } });
        return res.status(204).send();
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
