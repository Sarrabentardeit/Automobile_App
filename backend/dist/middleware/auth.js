"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
const authenticate = (required = true) => (req, res, next) => {
    const header = req.headers.authorization;
    if (!header) {
        if (!required)
            return next();
        return res.status(401).json({ error: 'Missing Authorization header' });
    }
    const [, token] = header.split(' ');
    if (!token) {
        if (!required)
            return next();
        return res.status(401).json({ error: 'Invalid Authorization header' });
    }
    try {
        const payload = jsonwebtoken_1.default.verify(token, env_1.env.JWT_ACCESS_SECRET);
        req.user = payload;
        return next();
    }
    catch {
        if (!required)
            return next();
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};
exports.authenticate = authenticate;
