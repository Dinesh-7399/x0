// src/interfaces/http/routes/gym.routes.ts

import { Hono } from 'hono';
import type { GymController } from '../controllers/GymController.js';

export function createGymRoutes(controller: GymController): Hono {
  const router = new Hono();

  // ============ PUBLIC ROUTES ============

  // GET /gyms/search - Search gyms
  router.get('/search', (c) => controller.search(c));

  // GET /gyms/:slug - Get gym by slug (public profile)
  router.get('/:slug', (c) => controller.getBySlug(c));

  // GET /gyms/:gymId/facilities - Get gym facilities
  router.get('/:gymId/facilities', (c) => controller.getFacilities(c));

  // GET /gyms/:gymId/hours - Get gym hours
  router.get('/:gymId/hours', (c) => controller.getHours(c));

  // ============ AUTHENTICATED ROUTES ============

  // POST /gyms - Create new gym
  router.post('/', (c) => controller.create(c));

  // GET /gyms/my - Get my gyms
  router.get('/my', (c) => controller.getMyGyms(c));

  // PUT /gyms/:gymId - Update gym
  router.put('/:gymId', (c) => controller.update(c));

  // PATCH /gyms/:gymId/status - Update gym status
  router.patch('/:gymId/status', (c) => controller.updateStatus(c));

  // DELETE /gyms/:gymId - Delete gym
  router.delete('/:gymId', (c) => controller.delete(c));

  // ============ STAFF ROUTES ============

  // GET /gyms/:gymId/staff - Get staff
  router.get('/:gymId/staff', (c) => controller.getStaff(c));

  // POST /gyms/:gymId/staff - Add staff
  router.post('/:gymId/staff', (c) => controller.addStaff(c));

  // PUT /gyms/:gymId/staff/:userId - Update staff
  router.put('/:gymId/staff/:userId', (c) => controller.updateStaff(c));

  // DELETE /gyms/:gymId/staff/:userId - Remove staff
  router.delete('/:gymId/staff/:userId', (c) => controller.removeStaff(c));

  // ============ EQUIPMENT ROUTES ============

  // GET /gyms/:gymId/equipment - Get equipment
  router.get('/:gymId/equipment', (c) => controller.getEquipment(c));

  // POST /gyms/:gymId/equipment - Add equipment
  router.post('/:gymId/equipment', (c) => controller.addEquipment(c));

  // PUT /gyms/:gymId/equipment/:equipmentId - Update equipment
  router.put('/:gymId/equipment/:equipmentId', (c) => controller.updateEquipment(c));

  // DELETE /gyms/:gymId/equipment/:equipmentId - Remove equipment
  router.delete('/:gymId/equipment/:equipmentId', (c) => controller.removeEquipment(c));

  return router;
}
