"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const router = (0, express_1.Router)();
const db = prisma_1.prisma;
const ETATS = ['orange', 'mauve', 'bleu', 'rouge', 'vert', 'retour'];
const TYPES = ['voiture', 'moto'];
const IMAGE_CATEGORIES = ['etat_exterieur', 'etat_interieur', 'compteur', 'plaque', 'dommage', 'intervention'];
const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const UPLOADS_ROOT = path_1.default.resolve(process.cwd(), 'uploads', 'vehicules');
const TRANSITIONS = {
    orange: ['bleu', 'mauve', 'rouge', 'vert', 'retour'],
    mauve: ['orange'],
    bleu: ['vert', 'orange'],
    rouge: ['orange', 'mauve'],
    vert: ['retour'],
    retour: [],
};
const ETAT_LABELS = {
    orange: 'Orange',
    mauve: 'Mauve',
    bleu: 'Bleu',
    rouge: 'Problème',
    vert: 'Validé',
    retour: 'Retour',
};
function etatLabel(e) {
    return ETAT_LABELS[e] ?? e;
}
/** Notifie les administrateurs / responsables (sauf l’auteur de l’action). */
async function notifyAdminsVehicule(opts) {
    try {
        if (typeof db.notification === 'undefined')
            return;
        const recipients = await db.user.findMany({
            where: {
                statut: 'actif',
                role: { in: ['admin', 'responsable'] },
                id: { not: opts.actorId },
            },
            select: { id: true },
        });
        for (const u of recipients) {
            await db.notification.create({
                data: {
                    userId: u.id,
                    type: opts.type,
                    title: opts.title,
                    message: opts.message,
                    vehiculeId: opts.vehiculeId,
                },
            });
        }
    }
    catch (e) {
        console.error('[vehicules] notifyAdminsVehicule:', e);
    }
}
function toVehiculeImage(i) {
    return {
        id: i.id,
        vehicule_id: i.vehiculeId,
        url_path: i.url_path,
        original_name: i.original_name,
        mime_type: i.mime_type,
        size_bytes: i.size_bytes,
        category: i.category,
        note: i.note,
        created_by_id: i.created_by_id,
        created_by: i.created_by,
        created_at: i.createdAt.toISOString(),
    };
}
function getImageExtension(mimeType) {
    if (mimeType === 'image/jpeg')
        return 'jpg';
    if (mimeType === 'image/png')
        return 'png';
    if (mimeType === 'image/webp')
        return 'webp';
    if (mimeType === 'image/heic')
        return 'heic';
    return 'bin';
}
function sanitizeOriginalName(fileName) {
    const raw = (fileName ?? '').trim();
    if (!raw)
        return '';
    return raw.replace(/[^\w.\- ]/g, '_').slice(0, 120);
}
function parseDataUrl(dataUrl) {
    if (!dataUrl)
        return null;
    const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
    if (!match)
        return null;
    const mimeType = match[1].toLowerCase();
    if (!ALLOWED_IMAGE_MIME_TYPES.includes(mimeType))
        return null;
    try {
        const buffer = Buffer.from(match[2], 'base64');
        return { mimeType, buffer };
    }
    catch {
        return null;
    }
}
function toVehicule(v) {
    return {
        id: v.id,
        immatriculation: v.immatriculation,
        modele: v.modele,
        type: v.type,
        etat_actuel: v.etat_actuel,
        service_type: v.service_type ?? undefined,
        technicien_id: v.technicien_id,
        responsable_id: v.responsable_id,
        defaut: v.defaut,
        client_telephone: v.client_telephone,
        date_entree: v.date_entree,
        date_sortie: v.date_sortie,
        notes: v.notes,
        derniere_mise_a_jour: v.derniere_mise_a_jour,
    };
}
function toHistorique(h) {
    return {
        id: h.id,
        vehicule_id: h.vehiculeId,
        etat_precedent: h.etat_precedent,
        etat_nouveau: h.etat_nouveau,
        date_changement: h.date_changement,
        utilisateur_id: h.utilisateur_id,
        utilisateur_nom: h.utilisateur_nom,
        commentaire: h.commentaire,
        duree_etat_precedent_minutes: h.duree_etat_precedent_min,
        pieces_utilisees: h.pieces_utilisees,
    };
}
function buildVehiculesWhere(query, includeEtat) {
    const where = {};
    if (includeEtat && query.etat && ETATS.includes(query.etat)) {
        where.etat_actuel = query.etat;
    }
    if (query.technicien_id) {
        const tid = parseInt(query.technicien_id, 10);
        if (!isNaN(tid))
            where.technicien_id = tid;
    }
    if (query.type && TYPES.includes(query.type)) {
        where.type = query.type;
    }
    if (query.date_debut || query.date_fin) {
        where.date_entree = {};
        if (query.date_debut)
            where.date_entree.gte = query.date_debut;
        if (query.date_fin)
            where.date_entree.lte = query.date_fin;
    }
    if (query.q) {
        where.OR = [
            { modele: { contains: query.q, mode: 'insensitive' } },
            { immatriculation: { contains: query.q, mode: 'insensitive' } },
            { defaut: { contains: query.q, mode: 'insensitive' } },
        ];
    }
    return where;
}
router.get('/stats', (0, auth_1.authenticate)(), async (req, res) => {
    try {
        const month = parseInt(req.query.month, 10);
        const year = parseInt(req.query.year, 10);
        const y = !isNaN(year) ? year : new Date().getFullYear();
        const m = !isNaN(month) && month >= 1 && month <= 12 ? month : new Date().getMonth() + 1;
        const debut = `${y}-${String(m).padStart(2, '0')}-01`;
        const fin = new Date(y, m, 0);
        const finStr = `${y}-${String(m).padStart(2, '0')}-${String(fin.getDate()).padStart(2, '0')}`;
        const [total, enCours, byEtat, terminesCeMois] = await Promise.all([
            db.vehicule.count(),
            db.vehicule.count({ where: { etat_actuel: { notIn: ['vert', 'retour'] } } }),
            db.vehicule.groupBy({
                by: ['etat_actuel'],
                _count: { id: true },
            }),
            db.vehiculeHistorique.count({
                where: {
                    etat_nouveau: 'vert',
                    date_changement: { gte: debut, lte: finStr + 'T23:59:59.999Z' },
                },
            }),
        ]);
        const byEtatMap = {};
        for (const row of byEtat) {
            byEtatMap[row.etat_actuel] = row._count.id;
        }
        return res.json({ total, enCours, byEtat: byEtatMap, terminesCeMois });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
router.get('/dashboard-summary', (0, auth_1.authenticate)(), async (_req, res) => {
    try {
        const today = new Date();
        const seuil = new Date(today);
        seuil.setDate(seuil.getDate() - 7);
        const seuilStr = `${seuil.getFullYear()}-${String(seuil.getMonth() + 1).padStart(2, '0')}-${String(seuil.getDate()).padStart(2, '0')}`;
        const [urgents, anciens, recentRaw, teamGrouped] = await Promise.all([
            db.vehicule.findMany({
                where: { etat_actuel: 'rouge' },
                orderBy: { id: 'desc' },
            }),
            db.vehicule.findMany({
                where: {
                    etat_actuel: { notIn: ['vert', 'rouge'] },
                    date_entree: { lt: seuilStr },
                },
                orderBy: { date_entree: 'asc' },
            }),
            db.vehiculeHistorique.findMany({
                orderBy: [{ date_changement: 'desc' }, { id: 'desc' }],
                take: 12,
            }),
            db.vehicule.groupBy({
                by: ['technicien_id'],
                where: {
                    technicien_id: { not: null },
                    etat_actuel: { not: 'vert' },
                },
                _count: { id: true },
            }),
        ]);
        const vehicleIds = Array.from(new Set(recentRaw.map(r => Number(r.vehiculeId)).filter((v) => !Number.isNaN(v))));
        const recentVehicles = vehicleIds.length
            ? await db.vehicule.findMany({
                where: { id: { in: vehicleIds } },
                select: { id: true, modele: true },
            })
            : [];
        const modelByVehiculeId = new Map(recentVehicles.map(v => [v.id, v.modele]));
        const teamLoadByTechnicien = {};
        for (const row of teamGrouped) {
            if (row.technicien_id == null)
                continue;
            teamLoadByTechnicien[String(row.technicien_id)] = row._count.id;
        }
        return res.json({
            problemsCount: urgents.length,
            urgents: urgents.map(toVehicule),
            anciens: anciens.map(toVehicule),
            recentActivity: recentRaw.map(h => ({
                ...toHistorique(h),
                vehicleModel: modelByVehiculeId.get(Number(h.vehiculeId)) ?? '',
            })),
            teamLoadByTechnicien,
        });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
router.get('/', (0, auth_1.authenticate)(), async (req, res) => {
    try {
        const etat = req.query.etat;
        const technicien_id = req.query.technicien_id;
        const type = req.query.type;
        const date_debut = req.query.date_debut;
        const date_fin = req.query.date_fin;
        const q = req.query.q?.trim();
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
        const where = buildVehiculesWhere({ etat, technicien_id, type, date_debut, date_fin, q }, true);
        const [list, total] = await Promise.all([
            db.vehicule.findMany({
                where: Object.keys(where).length ? where : undefined,
                orderBy: { id: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            db.vehicule.count({
                where: Object.keys(where).length ? where : undefined,
            }),
        ]);
        return res.json({ data: list.map(toVehicule), total, page, limit });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
router.get('/counts', (0, auth_1.authenticate)(), async (req, res) => {
    try {
        const etat = req.query.etat;
        const technicien_id = req.query.technicien_id;
        const type = req.query.type;
        const date_debut = req.query.date_debut;
        const date_fin = req.query.date_fin;
        const q = req.query.q?.trim();
        const includeEtat = String(req.query.includeEtat ?? 'false').toLowerCase() === 'true';
        const where = buildVehiculesWhere({ etat, technicien_id, type, date_debut, date_fin, q }, includeEtat);
        const [total, grouped] = await Promise.all([
            db.vehicule.count({ where: Object.keys(where).length ? where : undefined }),
            db.vehicule.groupBy({
                by: ['etat_actuel'],
                where: Object.keys(where).length ? where : undefined,
                _count: { id: true },
            }),
        ]);
        const byEtat = {};
        for (const e of ETATS)
            byEtat[e] = 0;
        for (const row of grouped) {
            byEtat[row.etat_actuel] = row._count.id;
        }
        return res.json({ total, byEtat });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
router.get('/:id/historique', (0, auth_1.authenticate)(), async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (isNaN(id))
            return res.status(400).json({ error: 'ID invalide' });
        const list = await db.vehiculeHistorique.findMany({
            where: { vehiculeId: id },
            orderBy: { date_changement: 'asc' },
        });
        return res.json(list.map(toHistorique));
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
router.get('/:id', (0, auth_1.authenticate)(), async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (isNaN(id))
            return res.status(400).json({ error: 'ID invalide' });
        const v = await db.vehicule.findUnique({ where: { id } });
        if (!v)
            return res.status(404).json({ error: 'Véhicule introuvable' });
        return res.json(toVehicule(v));
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
router.get('/:id/images', (0, auth_1.authenticate)(), async (req, res) => {
    try {
        if (!db.vehiculeImage) {
            return res.status(500).json({
                error: "Prisma client n'est pas à jour pour VehiculeImage. Arrête le backend, exécute `cd backend && npx prisma generate`, puis relance.",
            });
        }
        const id = Number(req.params.id);
        if (isNaN(id))
            return res.status(400).json({ error: 'ID invalide' });
        const existing = await db.vehicule.findUnique({ where: { id } });
        if (!existing)
            return res.status(404).json({ error: 'Véhicule introuvable' });
        const images = await db.vehiculeImage.findMany({
            where: { vehiculeId: id },
            orderBy: { createdAt: 'desc' },
        });
        return res.json(images.map(toVehiculeImage));
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
router.post('/:id/images', (0, auth_1.authenticate)(), async (req, res) => {
    try {
        if (!db.vehiculeImage) {
            return res.status(500).json({
                error: "Prisma client n'est pas à jour pour VehiculeImage. Arrête le backend, exécute `cd backend && npx prisma generate`, puis relance.",
            });
        }
        const id = Number(req.params.id);
        if (isNaN(id))
            return res.status(400).json({ error: 'ID invalide' });
        const body = req.body;
        const parsed = parseDataUrl(body.dataUrl);
        if (!parsed) {
            return res.status(400).json({ error: "Image invalide (format attendu: data URL base64 JPEG/PNG/WEBP/HEIC)." });
        }
        if (parsed.buffer.length > MAX_IMAGE_BYTES) {
            return res.status(400).json({ error: 'Image trop lourde (max 8 MB).' });
        }
        const vehicule = await db.vehicule.findUnique({ where: { id } });
        if (!vehicule)
            return res.status(404).json({ error: 'Véhicule introuvable' });
        const category = body.category && IMAGE_CATEGORIES.includes(body.category)
            ? body.category
            : 'etat_exterieur';
        const note = (body.note ?? '').trim().slice(0, 500);
        const originalName = sanitizeOriginalName(body.fileName);
        const ext = getImageExtension(parsed.mimeType);
        const generatedName = `${Date.now()}-${Math.floor(Math.random() * 1e9)}.${ext}`;
        const vehiculeDir = path_1.default.join(UPLOADS_ROOT, String(id));
        await fs_1.promises.mkdir(vehiculeDir, { recursive: true });
        const diskPath = path_1.default.join(vehiculeDir, generatedName);
        await fs_1.promises.writeFile(diskPath, parsed.buffer);
        const created = await db.vehiculeImage.create({
            data: {
                vehiculeId: id,
                url_path: `/uploads/vehicules/${id}/${generatedName}`,
                original_name: originalName,
                mime_type: parsed.mimeType,
                size_bytes: parsed.buffer.length,
                category,
                note,
                created_by_id: req.user?.sub ?? null,
                created_by: req.user?.fullName ?? req.user?.email ?? '',
            },
        });
        return res.status(201).json(toVehiculeImage(created));
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
router.delete('/:id/images/:imageId', (0, auth_1.authenticate)(), async (req, res) => {
    try {
        if (!db.vehiculeImage) {
            return res.status(500).json({
                error: "Prisma client n'est pas à jour pour VehiculeImage. Arrête le backend, exécute `cd backend && npx prisma generate`, puis relance.",
            });
        }
        const id = Number(req.params.id);
        const imageId = Number(req.params.imageId);
        if (isNaN(id) || isNaN(imageId))
            return res.status(400).json({ error: 'ID invalide' });
        const image = await db.vehiculeImage.findFirst({
            where: { id: imageId, vehiculeId: id },
        });
        if (!image)
            return res.status(404).json({ error: 'Photo introuvable' });
        const relativePath = String(image.url_path).startsWith('/uploads/')
            ? String(image.url_path).replace('/uploads/', '')
            : String(image.url_path);
        const diskPath = path_1.default.join(path_1.default.resolve(process.cwd(), 'uploads'), relativePath);
        await db.vehiculeImage.delete({ where: { id: imageId } });
        await fs_1.promises.unlink(diskPath).catch(() => undefined);
        return res.status(204).send();
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
router.post('/', (0, auth_1.authenticate)(), async (req, res) => {
    try {
        const body = req.body;
        if (!body.modele || !body.date_entree) {
            return res.status(400).json({ error: 'modele et date_entree sont requis' });
        }
        const now = new Date().toISOString();
        const etat = body.etat_initial && ETATS.includes(body.etat_initial) ? body.etat_initial : 'orange';
        const type = body.type && TYPES.includes(body.type) ? body.type : 'voiture';
        const v = await db.vehicule.create({
            data: {
                immatriculation: (body.immatriculation ?? '').trim(),
                modele: body.modele.trim(),
                type,
                etat_actuel: etat,
                service_type: (body.service_type ?? 'autre').trim() || 'autre',
                technicien_id: body.technicien_id ?? null,
                responsable_id: body.responsable_id ?? null,
                defaut: (body.defaut ?? '').trim(),
                client_telephone: (body.client_telephone ?? '').trim(),
                date_entree: body.date_entree,
                date_sortie: null,
                notes: (body.notes ?? '').trim(),
                derniere_mise_a_jour: now,
            },
        });
        const user = req.user;
        if (user) {
            await db.vehiculeHistorique.create({
                data: {
                    vehiculeId: v.id,
                    etat_precedent: null,
                    etat_nouveau: etat,
                    date_changement: now,
                    utilisateur_id: user.sub,
                    utilisateur_nom: user.fullName ?? user.email,
                    commentaire: `Réception du véhicule - ${body.defaut ?? ''}`,
                    duree_etat_precedent_min: null,
                    pieces_utilisees: '',
                },
            });
        }
        return res.status(201).json(toVehicule(v));
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
router.put('/:id', (0, auth_1.authenticate)(), async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (isNaN(id))
            return res.status(400).json({ error: 'ID invalide' });
        const body = req.body;
        const existing = await db.vehicule.findUnique({ where: { id } });
        if (!existing)
            return res.status(404).json({ error: 'Véhicule introuvable' });
        const data = { derniere_mise_a_jour: new Date().toISOString() };
        if (body.immatriculation != null)
            data.immatriculation = body.immatriculation;
        if (body.modele != null)
            data.modele = body.modele;
        if (body.type != null && TYPES.includes(body.type))
            data.type = body.type;
        if (body.defaut != null)
            data.defaut = body.defaut;
        if (body.service_type != null)
            data.service_type = body.service_type;
        if (body.technicien_id !== undefined)
            data.technicien_id = body.technicien_id;
        if (body.responsable_id !== undefined)
            data.responsable_id = body.responsable_id;
        if (body.client_telephone != null)
            data.client_telephone = body.client_telephone;
        if (body.notes != null)
            data.notes = body.notes;
        if (body.date_entree != null)
            data.date_entree = body.date_entree;
        const v = await db.vehicule.update({ where: { id }, data });
        const actor = req.user;
        if (actor) {
            const who = actor.fullName ?? actor.email;
            await notifyAdminsVehicule({
                actorId: actor.sub,
                vehiculeId: id,
                type: 'vehicule_update',
                title: 'Véhicule modifié',
                message: `${v.modele} (${(v.immatriculation ?? '').trim() || 'sans immat.'}) — fiche modifiée par ${who}.`,
            });
        }
        return res.json(toVehicule(v));
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
router.delete('/:id', (0, auth_1.authenticate)(), async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (isNaN(id))
            return res.status(400).json({ error: 'ID invalide' });
        const existing = await db.vehicule.findUnique({ where: { id } });
        if (!existing)
            return res.status(404).json({ error: 'Véhicule introuvable' });
        await db.vehicule.delete({ where: { id } });
        return res.status(204).send();
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
router.post('/:id/changer-etat', (0, auth_1.authenticate)(), async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (isNaN(id))
            return res.status(400).json({ error: 'ID invalide' });
        const body = req.body;
        if (!body.nouvel_etat || !ETATS.includes(body.nouvel_etat)) {
            return res.status(400).json({ error: 'nouvel_etat invalide' });
        }
        const vehicule = await db.vehicule.findUnique({ where: { id } });
        if (!vehicule)
            return res.status(404).json({ error: 'Véhicule introuvable' });
        const allowed = TRANSITIONS[vehicule.etat_actuel];
        if (!allowed || !allowed.includes(body.nouvel_etat)) {
            return res.status(400).json({ error: 'Transition non autorisée' });
        }
        const user = req.user;
        if (!user)
            return res.status(401).json({ error: 'Authentification requise' });
        const now = new Date().toISOString();
        const lastHist = await db.vehiculeHistorique.findFirst({
            where: { vehiculeId: id },
            orderBy: { date_changement: 'desc' },
        });
        let duree = null;
        if (lastHist) {
            duree = Math.round((new Date(now).getTime() - new Date(lastHist.date_changement).getTime()) / 60000);
        }
        const dateSortie = body.nouvel_etat === 'vert' ? now.split('T')[0] : null;
        await db.$transaction([
            db.vehicule.update({
                where: { id },
                data: {
                    etat_actuel: body.nouvel_etat,
                    derniere_mise_a_jour: now,
                    date_sortie: dateSortie ?? undefined,
                },
            }),
            db.vehiculeHistorique.create({
                data: {
                    vehiculeId: id,
                    etat_precedent: vehicule.etat_actuel,
                    etat_nouveau: body.nouvel_etat,
                    date_changement: now,
                    utilisateur_id: user.sub,
                    utilisateur_nom: user.fullName ?? user.email,
                    commentaire: (body.commentaire ?? '').trim(),
                    duree_etat_precedent_min: duree,
                    pieces_utilisees: (body.pieces_utilisees ?? '').trim(),
                },
            }),
        ]);
        const who = user.fullName ?? user.email;
        const ref = `${vehicule.modele} (${(vehicule.immatriculation ?? '').trim() || 'sans immat.'})`;
        await notifyAdminsVehicule({
            actorId: user.sub,
            vehiculeId: id,
            type: 'vehicule_etat',
            title: 'Changement d’état véhicule',
            message: `${ref} : ${etatLabel(vehicule.etat_actuel)} → ${etatLabel(body.nouvel_etat)} — par ${who}.`,
        });
        const updated = await db.vehicule.findUnique({ where: { id } });
        return res.json(toVehicule(updated));
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
