const validateParams = (schema) => async (req, res, next) => {
    try {
        const parseParams = await schema.parseAsync(req.params);
        req.params = parseParams;
        next();
    } catch (err) {
        // Check if it's a Zod error
        if (err.issues && Array.isArray(err.issues)) {
            // Extract all error messages from Zod issues
            const errorMessages = err.issues.map(issue => ({
                field: issue.path.join('.'),
                message: issue.message
            }));
            const status = 400;
            const error = {
                status,
                message: errorMessages
            }
            
            next(error);
        } else {
            const status = 400;
            const error = {
                status,
                message: 'Invalid request parameters',
            }
            next(error);
        }
    }
}

module.exports = validateParams;
