"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const path_1 = __importDefault(require("path"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("./config/env");
const auth_1 = __importDefault(require("./routes/auth"));
const users_1 = __importDefault(require("./routes/users"));
const vehicules_1 = __importDefault(require("./routes/vehicules"));
const stock_1 = __importDefault(require("./routes/stock"));
const clients_1 = __importDefault(require("./routes/clients"));
const factures_1 = __importDefault(require("./routes/factures"));
const achats_1 = __importDefault(require("./routes/achats"));
const contactsImportants_1 = __importDefault(require("./routes/contactsImportants"));
const fournisseurs_1 = __importDefault(require("./routes/fournisseurs"));
const fournisseurTransactions_1 = __importDefault(require("./routes/fournisseurTransactions"));
const demandesDevis_1 = __importDefault(require("./routes/demandesDevis"));
const clientsDettes_1 = __importDefault(require("./routes/clientsDettes"));
const reclamations_1 = __importDefault(require("./routes/reclamations"));
const notifications_1 = __importDefault(require("./routes/notifications"));
const teamMembers_1 = __importDefault(require("./routes/teamMembers"));
const calendarAssignments_1 = __importDefault(require("./routes/calendarAssignments"));
const caisse_1 = __importDefault(require("./routes/caisse"));
const monthlyCharges_1 = __importDefault(require("./routes/monthlyCharges"));
const money_1 = __importDefault(require("./routes/money"));
const outils_1 = __importDefault(require("./routes/outils"));
const checklists_1 = __importDefault(require("./routes/checklists"));
const stats_1 = __importDefault(require("./routes/stats"));
const settings_1 = __importDefault(require("./routes/settings"));
const app = (0, express_1.default)();
function canReadUploads(req) {
    const header = req.headers.authorization;
    let token = null;
    if (header?.startsWith('Bearer ')) {
        token = header.slice(7).trim();
    }
    else if (typeof req.query.accessToken === 'string' && req.query.accessToken.trim()) {
        token = req.query.accessToken.trim();
    }
    if (!token)
        return false;
    try {
        jsonwebtoken_1.default.verify(token, env_1.env.JWT_ACCESS_SECRET);
        return true;
    }
    catch {
        return false;
    }
}
app.use((0, helmet_1.default)({
    // Autorise l'affichage des images hébergées par l'API depuis le frontend (localhost:5175)
    crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use((0, cors_1.default)({
    origin: env_1.env.NODE_ENV === 'development'
        ? (origin, cb) => {
            const allowed = /^https?:\/\/localhost(:\d+)?$/.test(origin ?? '');
            cb(null, allowed ? origin : env_1.env.CORS_ORIGIN);
        }
        : env_1.env.CORS_ORIGIN,
    credentials: true
}));
app.use(express_1.default.json({ limit: '12mb' }));
/** Évite cache navigateur / proxy sur les réponses JSON (un poste ne doit pas voir d’anciennes données). */
app.use((req, res, next) => {
    if (req.path.startsWith('/uploads'))
        return next();
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    next();
});
app.use((0, morgan_1.default)('dev'));
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '..', 'uploads')));
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', env: env_1.env.NODE_ENV });
});
app.use('/auth', auth_1.default);
app.use('/users', users_1.default);
app.use('/vehicules', vehicules_1.default);
app.use('/stock', stock_1.default);
app.use('/clients', clients_1.default);
app.use('/factures', factures_1.default);
app.use('/achats', achats_1.default);
app.use('/contacts-importants', contactsImportants_1.default);
app.use('/fournisseurs', fournisseurs_1.default);
app.use('/fournisseur-transactions', fournisseurTransactions_1.default);
app.use('/demandes-devis', demandesDevis_1.default);
app.use('/clients-dettes', clientsDettes_1.default);
app.use('/reclamations', reclamations_1.default);
app.use('/notifications', notifications_1.default);
app.use('/team-members', teamMembers_1.default);
app.use('/calendar-assignments', calendarAssignments_1.default);
app.use('/caisse', caisse_1.default);
app.use('/charges-mensuelles', monthlyCharges_1.default);
app.use('/money', money_1.default);
app.use('/outils', outils_1.default);
app.use('/checklists', checklists_1.default);
app.use('/stats', stats_1.default);
app.use('/settings', settings_1.default);
app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: 'Unexpected error' });
});
app.listen(env_1.env.PORT, () => {
    console.log(`Backend listening on http://localhost:${env_1.env.PORT}`);
});
