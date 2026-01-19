// src/interfaces/http/validation/schemas.ts

import { z } from "zod";

const uuidSchema = z.string().uuid("Invalid ID format");

export const CheckInSchema = z.object({
  memberId: uuidSchema.optional(), // Optional if token provided
  gymId: uuidSchema,
  method: z.enum(["qr_code", "nfc", "manual", "geofence", "biometric", "kiosk"]),
  tokenValue: z.string().min(1).optional(),
  deviceId: z.string().optional(),
  staffId: uuidSchema.optional(),
}).refine(data => {
  if ((data.method === "qr_code" || data.method === "nfc") && !data.tokenValue) {
    return false;
  }
  if ((data.method === "manual" || data.method === "biometric") && !data.memberId) {
    return false;
  }
  return true;
}, {
  message: "Token is required for QR/NFC, Member ID is required for Manual/Biometric",
  path: ["tokenValue", "memberId"]
});

export const CheckOutSchema = z.object({
  memberId: uuidSchema,
  gymId: uuidSchema,
  method: z.enum(["qr_code", "nfc", "manual", "auto_timeout", "geofence"]),
  deviceId: z.string().optional(),
});

export const GenerateTokenSchema = z.object({
  gymId: uuidSchema,
});

export const HistoryQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

export type CheckInInput = z.infer<typeof CheckInSchema>;
export type CheckOutInput = z.infer<typeof CheckOutSchema>;
export type GenerateTokenInput = z.infer<typeof GenerateTokenSchema>;
