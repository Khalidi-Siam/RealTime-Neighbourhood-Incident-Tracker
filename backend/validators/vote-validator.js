const { z } = require('zod');

const voteSchema = z.object({
    voteType: z
        .enum(['upvote', 'downvote'], {
            required_error: "Vote type is required",
            invalid_type_error: "Vote type must be either 'upvote' or 'downvote'"
        })
});

const voteParamsSchema = z.object({
    incidentId: z
        .string({ required_error: "Incident ID is required" })
        .regex(/^[0-9a-fA-F]{24}$/, { message: "Invalid incident ID format" })
});

module.exports = {
    voteSchema,
    voteParamsSchema
};
