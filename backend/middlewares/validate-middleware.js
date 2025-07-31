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
            const status = 400;
            const error = {
                status,
                message : errorMessages
            }
            
            next(error);
        }
        const status = 400;
        const error = {
            status,
            message: 'Invalid request data',
        }
        next(error);        
    }
}

module.exports = validate;