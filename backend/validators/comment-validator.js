const { z } = require('zod');

const createCommentSchema = z.object({
    text: z
        .string({ required_error: "Comment text is required" }).trim()
        .min(1, { message: 'Comment cannot be empty' })
        .max(500, { message: 'Comment must not exceed 500 characters' })
});

const updateCommentSchema = z.object({
    text: z
        .string({ required_error: "Comment text is required" }).trim()
        .min(1, { message: 'Comment cannot be empty' })
        .max(500, { message: 'Comment must not exceed 500 characters' })
});

module.exports = {
    createCommentSchema,
    updateCommentSchema
};
