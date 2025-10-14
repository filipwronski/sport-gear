import { z } from "zod";

// ============================================================================
// Enum schemas
// ============================================================================

export const serviceTypeSchema = z.enum([
  "lancuch",
  "kaseta",
  "klocki_przod",
  "klocki_tyl",
  "opony",
  "przerzutki",
  "hamulce",
  "przeglad_ogolny",
  "inne",
]);

export const serviceLocationSchema = z.enum(["warsztat", "samodzielnie"]);

export const serviceSortSchema = z
  .enum([
    "service_date_asc",
    "service_date_desc",
    "mileage_asc",
    "mileage_desc",
    "cost_asc",
    "cost_desc",
  ])
  .default("service_date_desc");

// ============================================================================
// Query params schemas
// ============================================================================

export const getServicesParamsSchema = z
  .object({
    service_type: serviceTypeSchema.optional(),
    service_location: serviceLocationSchema.optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    offset: z.coerce.number().int().min(0).default(0),
    from_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    to_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    sort: serviceSortSchema,
  })
  .refine(
    (data) => {
      if (data.from_date && data.to_date) {
        return new Date(data.from_date) <= new Date(data.to_date);
      }
      return true;
    },
    { message: "from_date must be before or equal to to_date" },
  );

export const getServiceStatsParamsSchema = z
  .object({
    period: z.enum(["month", "quarter", "year", "all"]).default("all"),
    from_date: z.string().datetime().optional(),
    to_date: z.string().datetime().optional(),
  })
  .refine(
    (data) => {
      if (data.from_date && data.to_date) {
        return new Date(data.from_date) <= new Date(data.to_date);
      }
      return true;
    },
    { message: "from_date must be before or equal to to_date" },
  );

// ============================================================================
// Command schemas
// ============================================================================

export const createServiceSchema = z
  .object({
    service_date: z
      .string()
      .refine((date) => {
        const parsedDate = new Date(date);
        return !isNaN(parsedDate.getTime()) && parsedDate <= new Date();
      }, {
        message: "service_date must be a valid date and cannot be in the future",
      }),
    mileage_at_service: z.number().int().positive(),
    service_type: serviceTypeSchema,
    service_location: serviceLocationSchema.optional(),
    cost: z.number().min(0).optional(),
    notes: z.string().max(1000).optional(),
    create_reminder: z.boolean().optional().default(false),
    reminder_interval_km: z.number().int().min(100).max(10000).optional(),
  })
  .refine(
    (data) => {
      if (data.create_reminder) {
        return data.reminder_interval_km !== undefined;
      }
      return true;
    },
    {
      message: "reminder_interval_km is required when create_reminder is true",
    },
  );

export const updateServiceSchema = z.object({
  service_date: z
    .string()
    .refine((date) => {
      const parsedDate = new Date(date);
      return !isNaN(parsedDate.getTime()) && parsedDate <= new Date();
    }, {
      message: "service_date must be a valid date and cannot be in the future",
    })
    .optional(),
  mileage_at_service: z.number().int().positive().optional(),
  service_type: serviceTypeSchema.optional(),
  service_location: serviceLocationSchema.optional(),
  cost: z.number().min(0).optional(),
  notes: z.string().max(1000).optional(),
});

// ============================================================================
// Path params schemas
// ============================================================================

export const bikeIdParamSchema = z.object({
  bikeId: z.string().uuid(),
});

export const serviceIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const bikeServiceParamsSchema = z.object({
  bikeId: z.string().uuid(),
  id: z.string().uuid(),
});

// ============================================================================
// Type exports for use in services and endpoints
// ============================================================================

export type ServiceTypeEnum = z.infer<typeof serviceTypeSchema>;
export type ServiceLocationEnum = z.infer<typeof serviceLocationSchema>;
export type ServiceSortEnum = z.infer<typeof serviceSortSchema>;
export type GetServicesParams = z.infer<typeof getServicesParamsSchema>;
export type GetServiceStatsParams = z.infer<typeof getServiceStatsParamsSchema>;
export type CreateServiceCommand = z.infer<typeof createServiceSchema>;
export type UpdateServiceCommand = z.infer<typeof updateServiceSchema>;
export type BikeIdParam = z.infer<typeof bikeIdParamSchema>;
export type ServiceIdParam = z.infer<typeof serviceIdParamSchema>;
export type BikeServiceParams = z.infer<typeof bikeServiceParamsSchema>;
