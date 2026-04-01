"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const db = prisma_1.prisma;
function ensureChecklistModel(res) {
    if (!db.dailyChecklist) {
        res.status(500).json({
            error: "Prisma client n'est pas à jour pour DailyChecklist. Arrête le backend, exécute `cd backend && npx prisma generate`, puis relance le serveur.",
        });
        return false;
    }
    return true;
}
function ensureAuditModel(res) {
    if (!db.checklistAuditLog) {
        res.status(500).json({
            error: "Prisma client n'est pas à jour pour ChecklistAuditLog. Arrête le backend, exécute `cd backend && npx prisma generate`, puis relance le serveur.",
        });
        return false;
    }
    return true;
}
function getTodayDate() {
    return new Date().toISOString().slice(0, 10);
}
function mapChecklistRole(userRole) {
    const role = (userRole ?? '').toLowerCase();
    if (role === 'chef_atelier' || role === 'coordinateur' || role === 'technicien') {
        return role;
    }
    if (role === 'admin')
        return 'chef_atelier';
    if (role === 'responsable' || role === 'financier')
        return 'coordinateur';
    return 'technicien';
}
function createSection(id, title, labels) {
    return {
        id,
        title,
        items: labels.map((label, idx) => ({
            id: `${id}-${idx + 1}`,
            label,
            status: 'todo',
            comment: '',
        })),
    };
}
function createTemplate(role) {
    if (role === 'chef_atelier') {
        return {
            version: 1,
            sections: [
                createSection('arrivee', 'Arrivee / Debut de journee', [
                    'Arriver a 07:30 et signer le pointage.',
                    "Verifier presence et tenue de toute l'equipe.",
                    "Tour rapide de l'atelier: sol propre, pas d'huile, outils en place, machines fonctionnelles.",
                    'Preparer le planning du jour et repartir les vehicules selon priorite.',
                    'Mini reunion de 5 minutes avec mecaniciens et coordinateur: objectifs, urgences et securite.',
                ]),
                createSection('durant', 'Durant la journee', [
                    'Surveiller la progression des reparations.',
                    'Inspecter chaque vehicule apres reparation.',
                    'Verification du respect des normes de securite et qualite.',
                    'Gerer retards et reaffecter les taches si necessaire.',
                    "Verifier l'utilisation correcte des outils et equipements.",
                ]),
                createSection('fin', 'Fin journee / Depart', [
                    'Verifier que tous les vehicules termines sont prets pour livraison.',
                    'Verifier que les postes de travail sont ranges.',
                    'Verifier que les outils lourds et machines sont eteints et securises.',
                    'Noter problemes rencontres ou retards pour le lendemain.',
                    'Signer et transmettre le rapport quotidien au gerant.',
                ]),
            ],
        };
    }
    if (role === 'coordinateur') {
        return {
            version: 1,
            sections: [
                createSection('arrivee', 'Arrivee / Debut de journee', [
                    'Arriver a 7:30 et signer le pointage.',
                    'Verifier les rendez-vous clients du jour.',
                    'Preparer les fiches de travail.',
                    'Verifier disponibilite des pieces avant le debut du travail.',
                    "Informer l'equipe des vehicules urgents.",
                ]),
                createSection('durant', 'Durant la journee', [
                    'Mettre a jour le statut des vehicules.',
                    'Contacter les clients pour mise a jour sur reparation.',
                    'Coordonner entre mecaniciens et chef atelier pour respecter le planning.',
                    'Verifier que les outils et pieces utilises sont remis en place apres chaque intervention.',
                ]),
                createSection('fin', 'Fin de journee / Depart', [
                    'Confirmer vehicules prets a etre recuperes par clients.',
                    'Ranger le bureau et dossiers clients.',
                    'Mettre a jour liste pieces restantes ou manquantes.',
                    'Faire point final avec le chef atelier.',
                ]),
            ],
        };
    }
    return {
        version: 1,
        sections: [
            createSection('arrivee', 'Arrivee / Debut de journee', [
                'Arriver a 07:30 et signer le pointage.',
                'Tenue complete.',
                'Preparer poste de travail et nettoyer sol, outils et surface.',
                'Verifier fiche du premier vehicule.',
            ]),
            createSection('durant', 'Durant la journee', [
                'Suivre les instructions du chef mecanicien / chef atelier.',
                'Executer reparations simples ou preparatoires.',
                'Ranger outils apres chaque intervention.',
                'Signaler tout probleme ou incident.',
            ]),
            createSection('fin', 'Fin journee / Depart', [
                'Nettoyage complet du poste et de la zone de travail.',
                'Ranger tous les outils, chariots et pieces.',
                'Verifier que le sol est propre.',
                'Signaler anomalies ou materiel manquants.',
                'Sortie du garage apres approbation du chef atelier.',
            ]),
        ],
    };
}
function normalizeData(data, fallbackRole) {
    if (!data || typeof data !== 'object')
        return createTemplate(fallbackRole);
    const d = data;
    if (!Array.isArray(d.sections))
        return createTemplate(fallbackRole);
    const sections = d.sections
        .filter(s => s && typeof s === 'object')
        .map((section, idx) => {
        const sec = section;
        const items = Array.isArray(sec.items) ? sec.items : [];
        return {
            id: typeof sec.id === 'string' ? sec.id : `section-${idx + 1}`,
            title: typeof sec.title === 'string' ? sec.title : `Section ${idx + 1}`,
            items: items
                .filter(it => it && typeof it === 'object')
                .map((it, jdx) => {
                const item = it;
                const status = item.status === 'done' || item.status === 'na' || item.status === 'todo' ? item.status : 'todo';
                return {
                    id: typeof item.id === 'string' ? item.id : `item-${jdx + 1}`,
                    label: typeof item.label === 'string' ? item.label : `Tache ${jdx + 1}`,
                    status,
                    comment: typeof item.comment === 'string' ? item.comment : '',
                };
            }),
        };
    });
    return { version: 1, sections };
}
function mapChecklist(row) {
    return {
        id: row.id,
        userId: row.userId,
        userName: row.user?.fullName ?? '',
        role: row.role,
        date: row.date,
        status: row.status,
        data: row.data,
        submittedAt: row.submittedAt ? new Date(row.submittedAt).toISOString() : null,
        validatedAt: row.validatedAt ? new Date(row.validatedAt).toISOString() : null,
        validatorId: row.validatorId ?? null,
        validatorName: row.validator?.fullName ?? '',
        validatorComment: row.validatorComment ?? '',
        createdAt: new Date(row.createdAt).toISOString(),
        updatedAt: new Date(row.updatedAt).toISOString(),
    };
}
function mapChecklistWithMetrics(row) {
    const base = mapChecklist(row);
    const normalized = normalizeData(base.data, mapChecklistRole(base.role));
    const metrics = checklistCounts(normalized);
    return {
        ...base,
        data: normalized,
        metrics,
        lateSubmission: isLateSubmission(base.date, row.submittedAt),
    };
}
function mapAuditLog(row) {
    return {
        id: row.id,
        checklistId: row.checklistId,
        action: row.action,
        actorId: row.actorId ?? null,
        actorName: row.actorName ?? '',
        actorRole: row.actorRole ?? '',
        summary: row.summary ?? '',
        snapshot: row.snapshot ?? null,
        createdAt: new Date(row.createdAt).toISOString(),
    };
}
function checklistCounts(data) {
    let done = 0;
    let todo = 0;
    let na = 0;
    data.sections.forEach(section => {
        section.items.forEach(item => {
            if (item.status === 'done')
                done += 1;
            else if (item.status === 'na')
                na += 1;
            else
                todo += 1;
        });
    });
    return { done, todo, na, total: done + todo + na, nonConformities: todo };
}
function makeSubmissionDeadline(date) {
    return new Date(`${date}T17:30:00`);
}
function isLateSubmission(date, submittedAt) {
    if (!submittedAt)
        return false;
    return submittedAt.getTime() > makeSubmissionDeadline(date).getTime();
}
async function createAuditLog(params) {
    if (!db.checklistAuditLog)
        return;
    const { checklistId, action, actor, summary, snapshot } = params;
    await db.checklistAuditLog.create({
        data: {
            checklistId,
            action,
            actorId: actor?.sub ?? null,
            actorName: actor?.fullName ?? actor?.email ?? '',
            actorRole: actor?.role ?? '',
            summary,
            snapshot: snapshot ?? null,
        },
    });
}
function csvEscape(val) {
    const s = String(val ?? '');
    if (/[;"\n\r]/.test(s))
        return `"${s.replace(/"/g, '""')}"`;
    return s;
}
function parseOptionalInt(val) {
    if (val === undefined || val === null)
        return undefined;
    const raw = String(val).trim();
    if (!raw)
        return undefined;
    const n = Number(raw);
    if (!Number.isInteger(n))
        return undefined;
    return n;
}
function canReview(userRole) {
    return ['admin', 'responsable'].includes((userRole ?? '').toLowerCase());
}
function canReadChecklist(user, checklistUserId) {
    if (user.sub === checklistUserId)
        return true;
    return canReview(user.role);
}
router.use((0, auth_1.authenticate)());
router.get('/me/today', async (req, res) => {
    try {
        if (!ensureChecklistModel(res))
            return;
        const user = req.user;
        if (!user)
            return res.status(401).json({ error: 'Authentification requise' });
        const date = (String(req.query.date ?? '') || getTodayDate()).slice(0, 10);
        const mappedRole = mapChecklistRole(user.role);
        let checklist = await db.dailyChecklist.findUnique({
            where: { userId_date: { userId: user.sub, date } },
            include: { user: true, validator: true },
        });
        if (!checklist) {
            checklist = await db.dailyChecklist.create({
                data: {
                    userId: user.sub,
                    role: mappedRole,
                    date,
                    status: 'draft',
                    data: createTemplate(mappedRole),
                },
                include: { user: true, validator: true },
            });
            await createAuditLog({
                checklistId: checklist.id,
                action: 'created',
                actor: user,
                summary: `Checklist creee (${mappedRole})`,
                snapshot: checklist.data,
            });
        }
        return res.json(mapChecklist(checklist));
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
router.get('/me/history', async (req, res) => {
    try {
        if (!ensureChecklistModel(res))
            return;
        const user = req.user;
        if (!user)
            return res.status(401).json({ error: 'Authentification requise' });
        const limit = Math.min(60, Math.max(1, Number(req.query.limit ?? 14)));
        const list = await db.dailyChecklist.findMany({
            where: { userId: user.sub },
            orderBy: { date: 'desc' },
            take: limit,
            include: { user: true, validator: true },
        });
        return res.json(list.map(mapChecklist));
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
router.get('/audit/:id', async (req, res) => {
    try {
        if (!ensureChecklistModel(res) || !ensureAuditModel(res))
            return;
        const user = req.user;
        if (!user)
            return res.status(401).json({ error: 'Authentification requise' });
        const id = Number(req.params.id);
        if (isNaN(id))
            return res.status(400).json({ error: 'ID invalide' });
        const checklist = await db.dailyChecklist.findUnique({ where: { id } });
        if (!checklist)
            return res.status(404).json({ error: 'Checklist introuvable' });
        if (!canReadChecklist(user, checklist.userId))
            return res.status(403).json({ error: 'Acces refuse' });
        const logs = await db.checklistAuditLog.findMany({
            where: { checklistId: id },
            orderBy: { createdAt: 'asc' },
        });
        return res.json(logs.map(mapAuditLog));
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
router.get('/kpi/monthly', async (req, res) => {
    try {
        if (!ensureChecklistModel(res))
            return;
        const user = req.user;
        if (!user)
            return res.status(401).json({ error: 'Authentification requise' });
        const year = Math.max(2000, Math.min(2100, Number(req.query.year) || new Date().getFullYear()));
        const month = Math.max(1, Math.min(12, Number(req.query.month) || new Date().getMonth() + 1));
        const monthPrefix = `${year}-${String(month).padStart(2, '0')}`;
        const canSeeAll = canReview(user.role);
        const where = { date: { startsWith: monthPrefix } };
        if (!canSeeAll)
            where.userId = user.sub;
        const rows = await db.dailyChecklist.findMany({
            where,
            include: { user: true, validator: true },
            orderBy: { date: 'desc' },
        });
        let submitted = 0;
        let validated = 0;
        let rejected = 0;
        let lateSubmissions = 0;
        let nonConformities = 0;
        for (const row of rows) {
            const data = normalizeData(row.data, mapChecklistRole(row.role));
            const counts = checklistCounts(data);
            nonConformities += counts.nonConformities;
            if (row.status === 'submitted' || row.status === 'validated' || row.status === 'rejected') {
                submitted += 1;
            }
            if (row.status === 'validated')
                validated += 1;
            if (row.status === 'rejected')
                rejected += 1;
            if (isLateSubmission(row.date, row.submittedAt))
                lateSubmissions += 1;
        }
        const byRole = {};
        rows.forEach((r) => {
            byRole[r.role] = (byRole[r.role] ?? 0) + 1;
        });
        const submissionRate = rows.length > 0 ? Math.round((submitted / rows.length) * 100) : 0;
        const validationRate = submitted > 0 ? Math.round((validated / submitted) * 100) : 0;
        return res.json({
            period: monthPrefix,
            totalChecklists: rows.length,
            submitted,
            validated,
            rejected,
            lateSubmissions,
            nonConformities,
            submissionRate,
            validationRate,
            byRole,
        });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
router.get('/export', async (req, res) => {
    try {
        if (!ensureChecklistModel(res))
            return;
        const user = req.user;
        if (!user)
            return res.status(401).json({ error: 'Authentification requise' });
        const from = String(req.query.from ?? '').slice(0, 10);
        const to = String(req.query.to ?? '').slice(0, 10);
        const format = String(req.query.format ?? 'json').toLowerCase();
        const status = String(req.query.status ?? '');
        const canSeeAll = canReview(user.role);
        const userId = Number(req.query.userId);
        const where = {};
        if (!canSeeAll) {
            where.userId = user.sub;
        }
        else if (!isNaN(userId)) {
            where.userId = userId;
        }
        if (from || to) {
            where.date = {};
            if (from)
                where.date.gte = from;
            if (to)
                where.date.lte = to;
        }
        if (status)
            where.status = status;
        const rows = await db.dailyChecklist.findMany({
            where,
            include: { user: true, validator: true },
            orderBy: [{ date: 'desc' }, { updatedAt: 'desc' }],
        });
        const mapped = rows.map((row) => {
            const data = normalizeData(row.data, mapChecklistRole(row.role));
            const counts = checklistCounts(data);
            return {
                ...mapChecklist(row),
                metrics: counts,
                lateSubmission: isLateSubmission(row.date, row.submittedAt),
            };
        });
        if (format === 'csv') {
            const headers = [
                'Date',
                'Utilisateur',
                'Role',
                'Statut',
                'Fait',
                'Non Fait',
                'N/A',
                'Total',
                'Non Conformites',
                'Soumise En Retard',
                'Validateur',
                'Commentaire Validation',
            ];
            const csvRows = mapped.map((r) => [
                r.date,
                r.userName,
                r.role,
                r.status,
                r.metrics.done,
                r.metrics.todo,
                r.metrics.na,
                r.metrics.total,
                r.metrics.nonConformities,
                r.lateSubmission ? 'Oui' : 'Non',
                r.validatorName,
                r.validatorComment,
            ]);
            const csv = [headers.map(csvEscape).join(';'), ...csvRows.map((row) => row.map(csvEscape).join(';'))].join('\n');
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="checklists-${from || 'all'}-${to || 'all'}.csv"`);
            return res.send('\ufeff' + csv);
        }
        return res.json(mapped);
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
router.get('/item/:id', async (req, res) => {
    try {
        if (!ensureChecklistModel(res))
            return;
        const user = req.user;
        if (!user)
            return res.status(401).json({ error: 'Authentification requise' });
        const id = Number(req.params.id);
        if (isNaN(id))
            return res.status(400).json({ error: 'ID invalide' });
        const checklist = await db.dailyChecklist.findUnique({
            where: { id },
            include: { user: true, validator: true },
        });
        if (!checklist)
            return res.status(404).json({ error: 'Checklist introuvable' });
        if (!canReadChecklist(user, checklist.userId)) {
            return res.status(403).json({ error: 'Acces refuse' });
        }
        return res.json(mapChecklist(checklist));
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
router.put('/:id', async (req, res) => {
    try {
        if (!ensureChecklistModel(res))
            return;
        const user = req.user;
        if (!user)
            return res.status(401).json({ error: 'Authentification requise' });
        const id = Number(req.params.id);
        if (isNaN(id))
            return res.status(400).json({ error: 'ID invalide' });
        const existing = await db.dailyChecklist.findUnique({
            where: { id },
            include: { user: true, validator: true },
        });
        if (!existing)
            return res.status(404).json({ error: 'Checklist introuvable' });
        if (existing.userId !== user.sub)
            return res.status(403).json({ error: 'Acces refuse' });
        if (existing.status === 'validated') {
            return res.status(400).json({ error: 'Checklist deja validee, modification impossible.' });
        }
        if (existing.status === 'submitted') {
            return res.status(400).json({ error: 'Checklist soumise. Attendez validation ou rejet.' });
        }
        const role = existing.role;
        const normalized = normalizeData(req.body.data, role);
        const updated = await db.dailyChecklist.update({
            where: { id },
            data: {
                data: normalized,
                status: existing.status === 'rejected' ? 'draft' : existing.status,
            },
            include: { user: true, validator: true },
        });
        const c = checklistCounts(updated.data);
        await createAuditLog({
            checklistId: updated.id,
            action: 'updated',
            actor: user,
            summary: `Brouillon mis a jour (${c.done}/${c.total} fait/NA)`,
            snapshot: updated.data,
        });
        return res.json(mapChecklist(updated));
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
router.post('/:id/submit', async (req, res) => {
    try {
        if (!ensureChecklistModel(res))
            return;
        const user = req.user;
        if (!user)
            return res.status(401).json({ error: 'Authentification requise' });
        const id = Number(req.params.id);
        if (isNaN(id))
            return res.status(400).json({ error: 'ID invalide' });
        const existing = await db.dailyChecklist.findUnique({
            where: { id },
            include: { user: true, validator: true },
        });
        if (!existing)
            return res.status(404).json({ error: 'Checklist introuvable' });
        if (existing.userId !== user.sub)
            return res.status(403).json({ error: 'Acces refuse' });
        if (existing.status === 'validated') {
            return res.status(400).json({ error: 'Checklist deja validee.' });
        }
        const updated = await db.dailyChecklist.update({
            where: { id },
            data: {
                status: 'submitted',
                submittedAt: new Date(),
            },
            include: { user: true, validator: true },
        });
        const c = checklistCounts(updated.data);
        await createAuditLog({
            checklistId: updated.id,
            action: 'submitted',
            actor: user,
            summary: `Checklist soumise (${c.done}/${c.total} fait/NA, non conformites: ${c.nonConformities})`,
            snapshot: updated.data,
        });
        return res.json(mapChecklist(updated));
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
router.get('/pending/review', async (req, res) => {
    try {
        if (!ensureChecklistModel(res))
            return;
        const user = req.user;
        if (!user)
            return res.status(401).json({ error: 'Authentification requise' });
        if (!canReview(user.role)) {
            return res.status(403).json({ error: 'Acces reserve aux validateurs.' });
        }
        const date = String(req.query.date ?? '').slice(0, 10);
        const where = { status: 'submitted' };
        if (date)
            where.date = date;
        const list = await db.dailyChecklist.findMany({
            where,
            include: { user: true, validator: true },
            orderBy: [{ date: 'desc' }, { updatedAt: 'desc' }],
        });
        return res.json(list.map(mapChecklist));
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
router.get('/review/history', async (req, res) => {
    try {
        if (!ensureChecklistModel(res))
            return;
        const user = req.user;
        if (!user)
            return res.status(401).json({ error: 'Authentification requise' });
        if (!canReview(user.role)) {
            return res.status(403).json({ error: 'Acces reserve aux validateurs.' });
        }
        const date = String(req.query.date ?? '').slice(0, 10);
        const from = String(req.query.from ?? '').slice(0, 10);
        const to = String(req.query.to ?? '').slice(0, 10);
        const status = String(req.query.status ?? '');
        const userId = parseOptionalInt(req.query.userId);
        const validatorId = parseOptionalInt(req.query.validatorId);
        const q = String(req.query.q ?? '').trim().toLowerCase();
        const sortBy = String(req.query.sortBy ?? 'date');
        const sortDir = String(req.query.sortDir ?? 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc';
        const limit = Math.min(200, Math.max(1, Number(req.query.limit ?? 60)));
        const where = {
            status: status === 'validated' || status === 'rejected' ? status : { in: ['validated', 'rejected'] },
        };
        if (from || to) {
            where.date = {};
            if (from)
                where.date.gte = from;
            if (to)
                where.date.lte = to;
        }
        else if (date) {
            where.date = date;
        }
        if (userId !== undefined)
            where.userId = userId;
        if (validatorId !== undefined)
            where.validatorId = validatorId;
        const list = await db.dailyChecklist.findMany({
            where,
            include: { user: true, validator: true },
            orderBy: [{ date: 'desc' }, { validatedAt: 'desc' }, { updatedAt: 'desc' }],
        });
        let mapped = list.map((row) => mapChecklistWithMetrics(row));
        if (q) {
            mapped = mapped.filter((row) => {
                const haystack = [
                    row.userName,
                    row.role,
                    row.status,
                    row.validatorName,
                    row.validatorComment,
                    JSON.stringify(row.data),
                ]
                    .join(' ')
                    .toLowerCase();
                return haystack.includes(q);
            });
        }
        const sortFactor = sortDir === 'asc' ? 1 : -1;
        mapped.sort((a, b) => {
            if (sortBy === 'nonConformities')
                return (a.metrics.nonConformities - b.metrics.nonConformities) * sortFactor;
            if (sortBy === 'late')
                return ((a.lateSubmission ? 1 : 0) - (b.lateSubmission ? 1 : 0)) * sortFactor;
            if (sortBy === 'user')
                return a.userName.localeCompare(b.userName) * sortFactor;
            if (sortBy === 'status')
                return a.status.localeCompare(b.status) * sortFactor;
            const av = a.date || '';
            const bv = b.date || '';
            return av.localeCompare(bv) * sortFactor;
        });
        return res.json(mapped.slice(0, limit));
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
router.get('/review/summary', async (req, res) => {
    try {
        if (!ensureChecklistModel(res))
            return;
        const user = req.user;
        if (!user)
            return res.status(401).json({ error: 'Authentification requise' });
        if (!canReview(user.role)) {
            return res.status(403).json({ error: 'Acces reserve aux validateurs.' });
        }
        const from = String(req.query.from ?? '').slice(0, 10);
        const to = String(req.query.to ?? '').slice(0, 10);
        const where = {
            status: { in: ['validated', 'rejected'] },
        };
        if (from || to) {
            where.date = {};
            if (from)
                where.date.gte = from;
            if (to)
                where.date.lte = to;
        }
        const list = await db.dailyChecklist.findMany({
            where,
            include: { user: true, validator: true },
            orderBy: { date: 'desc' },
        });
        const rows = list.map((row) => mapChecklistWithMetrics(row));
        const byUser = new Map();
        rows.forEach((row) => {
            const existing = byUser.get(row.userId) ?? {
                userId: row.userId,
                userName: row.userName,
                role: row.role,
                total: 0,
                validated: 0,
                rejected: 0,
                lateSubmissions: 0,
                nonConformities: 0,
                completionPoints: 0,
            };
            existing.total += 1;
            if (row.status === 'validated')
                existing.validated += 1;
            if (row.status === 'rejected')
                existing.rejected += 1;
            if (row.lateSubmission)
                existing.lateSubmissions += 1;
            existing.nonConformities += row.metrics.nonConformities;
            const completionRate = row.metrics.total > 0 ? row.metrics.done / row.metrics.total : 0;
            existing.completionPoints += completionRate;
            byUser.set(row.userId, existing);
        });
        const summary = Array.from(byUser.values())
            .map((row) => ({
            userId: row.userId,
            userName: row.userName,
            role: row.role,
            total: row.total,
            validated: row.validated,
            rejected: row.rejected,
            lateSubmissions: row.lateSubmissions,
            nonConformities: row.nonConformities,
            avgCompletionRate: row.total > 0 ? Math.round((row.completionPoints / row.total) * 100) : 0,
        }))
            .sort((a, b) => b.nonConformities - a.nonConformities || b.lateSubmissions - a.lateSubmissions);
        return res.json(summary);
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
router.post('/:id/review', async (req, res) => {
    try {
        if (!ensureChecklistModel(res))
            return;
        const user = req.user;
        if (!user)
            return res.status(401).json({ error: 'Authentification requise' });
        if (!canReview(user.role)) {
            return res.status(403).json({ error: 'Acces reserve aux validateurs.' });
        }
        const id = Number(req.params.id);
        if (isNaN(id))
            return res.status(400).json({ error: 'ID invalide' });
        const body = req.body;
        if (!body.action || !['validate', 'reject'].includes(body.action)) {
            return res.status(400).json({ error: "Action invalide (validate/reject)." });
        }
        if (body.action === 'reject' && !(body.comment ?? '').trim()) {
            return res.status(400).json({ error: 'Le motif est obligatoire pour un rejet.' });
        }
        const existing = await db.dailyChecklist.findUnique({
            where: { id },
            include: { user: true, validator: true },
        });
        if (!existing)
            return res.status(404).json({ error: 'Checklist introuvable' });
        if (existing.status !== 'submitted') {
            return res.status(400).json({ error: 'Seules les checklists soumises peuvent etre traitees.' });
        }
        const updated = await db.dailyChecklist.update({
            where: { id },
            data: body.action === 'validate'
                ? {
                    status: 'validated',
                    validatedAt: new Date(),
                    validatorId: user.sub,
                    validatorComment: (body.comment ?? '').trim(),
                }
                : {
                    status: 'rejected',
                    validatedAt: null,
                    validatorId: user.sub,
                    validatorComment: (body.comment ?? '').trim(),
                },
            include: { user: true, validator: true },
        });
        await createAuditLog({
            checklistId: updated.id,
            action: body.action === 'validate' ? 'validated' : 'rejected',
            actor: user,
            summary: body.action === 'validate'
                ? `Checklist validee${(body.comment ?? '').trim() ? `: ${(body.comment ?? '').trim()}` : ''}`
                : `Checklist rejetee: ${(body.comment ?? '').trim()}`,
            snapshot: updated.data,
        });
        return res.json(mapChecklist(updated));
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
