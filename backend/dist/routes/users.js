"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const ROLES = ['admin', 'responsable', 'technicien', 'financier'];
function isAdmin(req) {
    return req.user?.role === 'admin';
}
router.get('/', (0, auth_1.authenticate)(), async (req, res) => {
    try {
        const users = await prisma_1.prisma.user.findMany({
            orderBy: { id: 'asc' },
            select: {
                id: true,
                email: true,
                fullName: true,
                telephone: true,
                role: true,
                permissions: true,
                statut: true,
                createdAt: true,
            },
        });
        const mapped = users.map(u => ({
            id: u.id,
            email: u.email,
            nom_complet: u.fullName,
            telephone: u.telephone ?? '',
            role: ROLES.includes(u.role) ? u.role : 'technicien',
            permissions: u.permissions ?? {},
            statut: u.statut === 'inactif' ? 'inactif' : 'actif',
            date_creation: u.createdAt.toISOString().slice(0, 10),
            derniere_connexion: null,
        }));
        return res.json(mapped);
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
router.post('/', (0, auth_1.authenticate)(), async (req, res) => {
    if (!isAdmin(req)) {
        return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
    }
    try {
        const { email, password, fullName, telephone, role, permissions } = req.body;
        if (!email || !password || !fullName) {
            return res.status(400).json({ error: 'email, password et fullName sont requis' });
        }
        const existing = await prisma_1.prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
        if (existing) {
            return res.status(409).json({ error: 'Cet email est déjà utilisé' });
        }
        const r = role && ROLES.includes(role) ? role : 'technicien';
        const perms = permissions && typeof permissions === 'object' ? permissions : {};
        const hash = await bcryptjs_1.default.hash(password, 10);
        const user = await prisma_1.prisma.user.create({
            data: {
                email: email.trim().toLowerCase(),
                password: hash,
                fullName: fullName.trim(),
                telephone: (telephone ?? '').trim(),
                role: r,
                permissions: perms,
                statut: 'actif',
            },
        });
        const u = user;
        return res.status(201).json({
            id: u.id,
            email: u.email,
            nom_complet: u.fullName,
            telephone: u.telephone ?? '',
            role: u.role,
            permissions: u.permissions ?? {},
            statut: 'actif',
            date_creation: user.createdAt.toISOString().slice(0, 10),
            derniere_connexion: null,
        });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
router.put('/:id', (0, auth_1.authenticate)(), async (req, res) => {
    if (!isAdmin(req)) {
        return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
    }
    try {
        const id = Number(req.params.id);
        if (isNaN(id))
            return res.status(400).json({ error: 'ID invalide' });
        const { fullName, telephone, role, permissions, statut, password } = req.body;
        const existing = await prisma_1.prisma.user.findUnique({ where: { id } });
        if (!existing)
            return res.status(404).json({ error: 'Utilisateur introuvable' });
        const data = {};
        if (fullName != null)
            data.fullName = String(fullName).trim();
        if (telephone != null)
            data.telephone = String(telephone).trim();
        if (role && ROLES.includes(role))
            data.role = role;
        if (permissions && typeof permissions === 'object')
            data.permissions = permissions;
        if (statut === 'inactif' || statut === 'actif')
            data.statut = statut;
        if (password && password.length >= 6) {
            data.password = await bcryptjs_1.default.hash(password, 10);
        }
        const user = await prisma_1.prisma.user.update({
            where: { id },
            data,
        });
        return res.json({
            id: user.id,
            email: user.email,
            nom_complet: user.fullName,
            telephone: user.telephone ?? '',
            role: user.role,
            permissions: user.permissions ?? {},
            statut: user.statut ?? 'actif',
            date_creation: user.createdAt.toISOString().slice(0, 10),
            derniere_connexion: null,
        });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
router.delete('/:id', (0, auth_1.authenticate)(), async (req, res) => {
    if (!isAdmin(req)) {
        return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
    }
    try {
        const id = Number(req.params.id);
        if (isNaN(id))
            return res.status(400).json({ error: 'ID invalide' });
        const target = await prisma_1.prisma.user.findUnique({ where: { id } });
        if (!target)
            return res.status(404).json({ error: 'Utilisateur introuvable' });
        // évite de supprimer l'utilisateur connecté par erreur
        if (req.user?.sub === id) {
            return res.status(400).json({ error: 'Vous ne pouvez pas supprimer votre propre compte' });
        }
        // garde-fou: ne pas supprimer le dernier admin
        if (target.role === 'admin') {
            const adminCount = await prisma_1.prisma.user.count({ where: { role: 'admin' } });
            if (adminCount <= 1) {
                return res.status(400).json({ error: 'Impossible de supprimer le dernier administrateur' });
            }
        }
        await prisma_1.prisma.user.delete({ where: { id } });
        return res.status(204).send();
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
