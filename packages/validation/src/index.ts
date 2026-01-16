// @gymato/validation - Common Zod schemas and validators
import { z } from 'zod';

/**
 * Email validation schema
 */
export const emailSchema = z
  .string()
  .email('Invalid email address')
  .min(5, 'Email must be at least 5 characters')
  .max(255, 'Email must be at most 255 characters')
  .toLowerCase();

/**
 * Password validation schema
 */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

/**
 * Phone number validation (basic)
 */
export const phoneSchema = z
  .string()
  .regex(/^\+?[1-9]\d{6,14}$/, 'Invalid phone number format');

/**
 * UUID validation
 */
export const uuidSchema = z.string().uuid('Invalid ID format');

/**
 * Pagination query params
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/**
 * Date range validation
 */
export const dateRangeSchema = z
  .object({
    from: z.coerce.date(),
    to: z.coerce.date(),
  })
  .refine((data) => data.from <= data.to, {
    message: 'From date must be before or equal to To date',
    path: ['from'],
  });

/**
 * Non-empty string
 */
export const nonEmptyString = z.string().min(1, 'This field is required').trim();

/**
 * User role validation
 */
export const userRoleSchema = z.enum(['user', 'trainer', 'gym_owner', 'admin']);

/**
 * Create a validated ID param schema for routes
 */
export function createIdParamSchema(paramName = 'id') {
  return z.object({
    [paramName]: uuidSchema,
  });
}

/**
 * Validate and parse data with a Zod schema
 * Returns a result object instead of throwing
 */
export function validateSafe<T extends z.ZodSchema>(
  schema: T,
  data: unknown
): { success: true; data: z.infer<T> } | { success: false; errors: z.ZodError } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

/**
 * Format Zod errors into a simple object
 */
export function formatZodErrors(error: z.ZodError): Record<string, string[]> {
  const formatted: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const path = issue.path.join('.') || '_root';
    if (!formatted[path]) {
      formatted[path] = [];
    }
    formatted[path].push(issue.message);
  }
  return formatted;
}

// Re-export zod for convenience
export { z };
