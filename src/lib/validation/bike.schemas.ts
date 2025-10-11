import { z } from "zod";

/**
 * Zod schemas for bike management endpoints validation
 * Based on types.ts interfaces and business rules from implementation plan
 */

// Enum schemas
export const BikeTypeSchema = z.enum(
  ["szosowy", "gravelowy", "mtb", "czasowy"],
  {
    errorMap: () => ({
      message: "Type must be one of: szosowy, gravelowy, mtb, czasowy",
    }),
  },
);

export const BikeStatusSchema = z.enum(["active", "archived", "sold"], {
  errorMap: () => ({
    message: "Status must be one of: active, archived, sold",
  }),
});

/**
 * Schema for creating a new bike
 * Required: name, type
 * Optional: purchase_date, current_mileage, notes
 */
export const CreateBikeSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(50, "Name must be max 50 characters")
    .trim(),
  type: BikeTypeSchema,
  purchase_date: z
    .string()
    .datetime({ message: "Purchase date must be a valid ISO datetime" })
    .optional()
    .nullable(),
  current_mileage: z
    .number()
    .int("Mileage must be an integer")
    .min(0, "Mileage must be non-negative")
    .optional(),
  notes: z
    .string()
    .max(500, "Notes must be max 500 characters")
    .optional()
    .nullable(),
});

/**
 * Schema for updating a bike
 * All fields optional for partial updates
 * At least one field must be provided
 */
export const UpdateBikeSchema = z
  .object({
    name: z
      .string()
      .min(1, "Name cannot be empty")
      .max(50, "Name must be max 50 characters")
      .trim()
      .optional(),
    type: BikeTypeSchema.optional(),
    purchase_date: z
      .string()
      .datetime({ message: "Purchase date must be a valid ISO datetime" })
      .optional()
      .nullable(),
    current_mileage: z
      .number()
      .int("Mileage must be an integer")
      .min(0, "Mileage must be non-negative")
      .optional(),
    status: BikeStatusSchema.optional(),
    notes: z
      .string()
      .max(500, "Notes must be max 500 characters")
      .optional()
      .nullable(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  });

/**
 * Schema for updating bike mileage (PATCH endpoint)
 * Business rule: mileage cannot decrease
 */
export const UpdateMileageSchema = z.object({
  current_mileage: z
    .number()
    .int("Mileage must be an integer")
    .min(0, "Mileage must be non-negative"),
});

/**
 * Schema for query parameters in GET /api/bikes
 * Both parameters are optional filters
 */
export const GetBikesQuerySchema = z.object({
  status: BikeStatusSchema.optional(),
  type: BikeTypeSchema.optional(),
});

/**
 * Schema for bike ID path parameter validation
 * Ensures UUID format
 */
export const BikeIdSchema = z.string().uuid("Bike ID must be a valid UUID");

/**
 * Type exports for use in route handlers
 */
export type CreateBikeInput = z.infer<typeof CreateBikeSchema>;
export type UpdateBikeInput = z.infer<typeof UpdateBikeSchema>;
export type UpdateMileageInput = z.infer<typeof UpdateMileageSchema>;
export type GetBikesQuery = z.infer<typeof GetBikesQuerySchema>;
