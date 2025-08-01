const { z } = require('zod');

const createFalseReportSchema = z.object({
    reason: z
        .string().trim()
        .min(1, { message: 'Reason cannot be empty' })
        .max(500, { message: 'Reason must not exceed 500 characters' })
        .optional()
        .default('Possibly false or spam')
});

const falseReportParamsSchema = z.object({
    incidentId: z
        .string({ required_error: "Incident ID is required" })
        .regex(/^[0-9a-fA-F]{24}$/, { message: "Invalid incident ID format" })
});

module.exports = {
    createFalseReportSchema,
    falseReportParamsSchema
};
