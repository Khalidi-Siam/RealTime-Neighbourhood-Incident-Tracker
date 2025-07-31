const validate = (schema) => async (req, res, next) => {
    try{
        const parseBody = await schema.parseAsync(req.body);
        req.body = parseBody;
        next();
    } catch (err) {
        // Check if it's a Zod error
        if (err.issues && Array.isArray(err.issues)) {
            // Extract all error messages from Zod issues
            const errorMessages = err.issues.map(issue => ({
                field: issue.path.join('.'),
                message: issue.message
            }));
            errorMessage = errorMessages[0].message;
            
            return res.status(400).json({
                errors: errorMessages
            });
        }
        return res.status(400).json({
            message: 'Invalid request data',
        });
    }
}

module.exports = validate;