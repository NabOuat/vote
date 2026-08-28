/** Express 4 ne relaie pas automatiquement les rejets de promesse d'un
 * handler async vers le middleware d'erreur (contrairement à Express 5) —
 * indispensable ici puisque toutes les routes sont devenues async avec
 * libSQL. Sans ça, une erreur DB resterait une requête qui ne répond jamais. */
export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)
