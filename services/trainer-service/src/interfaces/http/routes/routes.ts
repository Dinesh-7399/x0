import { Hono } from 'hono';
import { TrainerController } from '../controllers/TrainerController.js';
import { ScheduleController } from '../controllers/ScheduleController.js';

export function createRoutes(): Hono {
  const router = new Hono();
  const trainerController = new TrainerController();
  const scheduleController = new ScheduleController();

  // ============ TRAINERS ============

  // Profile Management
  router.post('/trainers/profile', (c) => trainerController.createProfile(c));
  router.put('/trainers/profile', (c) => trainerController.updateProfile(c));
  router.get('/trainers/me', (c) => trainerController.getMyProfile(c));
  router.get('/trainers/:id', (c) => trainerController.getProfile(c));

  // Certifications
  router.post('/trainers/certifications', (c) => trainerController.addCertification(c));
  router.get('/trainers/:id/certifications', (c) => trainerController.getCertifications(c));

  // Employment
  router.post('/trainers/employment', (c) => trainerController.requestEmployment(c));
  router.get('/trainers/:id/employments', (c) => trainerController.getEmployments(c));

  // ============ SCHEDULE ============

  router.post('/schedule/availability', (c) => scheduleController.setAvailability(c));
  router.get('/schedule/:trainerId', (c) => scheduleController.getAvailability(c));
  router.delete('/schedule/clear', (c) => scheduleController.clearDay(c));

  return router;
}
