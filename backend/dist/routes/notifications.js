"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
/** POST /notifications - créer une notification pour un utilisateur */
router.post('/', (0, auth_1.authenticate)(), async (req, res) => {
    try {
        const actorId = req.user?.sub;
        if (!actorId)
            return res.status(401).json({ error: 'Non authentifié' });
        const body = req.body;
        if (!body.userId || !body.message?.trim()) {
            return res.status(400).json({ error: 'userId et message requis' });
        }
        const created = await prisma_1.prisma.notification.create({
            data: {
                userId: body.userId,
                message: body.message.trim(),
                type: body.type?.trim() || 'manual',
                reclamationId: body.reclamationId ?? null,
                title: body.title?.trim() || null,
                read: false,
            },
        });
        return res.status(201).json({
            id: created.id,
            userId: created.userId,
            type: created.type,
            reclamationId: created.reclamationId ?? undefined,
            title: created.title ?? undefined,
            message: created.message,
            date: created.createdAt.toISOString(),
            read: created.read,
        });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
/** GET /notifications - liste des notifications de l'utilisateur connecté */
router.get('/', (0, auth_1.authenticate)(), async (req, res) => {
    try {
        const userId = req.user?.sub;
        if (!userId)
            return res.status(401).json({ error: 'Non authentifié' });
        const list = await prisma_1.prisma.notification.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 100,
        });
        const mapped = list.map((n) => ({
            id: n.id,
            userId: n.userId,
            type: n.type,
            reclamationId: n.reclamationId ?? undefined,
            title: n.title ?? undefined,
            message: n.message,
            date: n.createdAt.toISOString(),
            read: n.read,
        }));
        return res.json(mapped);
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
/** PATCH /notifications/:id/read - marquer une notification comme lue */
router.patch('/:id/read', (0, auth_1.authenticate)(), async (req, res) => {
    try {
        const userId = req.user?.sub;
        if (!userId)
            return res.status(401).json({ error: 'Non authentifié' });
        const id = Number(req.params.id);
        if (isNaN(id))
            return res.status(400).json({ error: 'ID invalide' });
        const notif = await prisma_1.prisma.notification.findFirst({
            where: { id, userId },
        });
        if (!notif)
            return res.status(404).json({ error: 'Notification introuvable' });
        await prisma_1.prisma.notification.update({
            where: { id },
            data: { read: true },
        });
        return res.json({ ok: true });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
/** PATCH /notifications/read-all - marquer toutes les notifications de l'utilisateur comme lues */
router.patch('/read-all', (0, auth_1.authenticate)(), async (req, res) => {
    try {
        const userId = req.user?.sub;
        if (!userId)
            return res.status(401).json({ error: 'Non authentifié' });
        await prisma_1.prisma.notification.updateMany({
            where: { userId, read: false },
            data: { read: true },
        });
        return res.json({ ok: true });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
