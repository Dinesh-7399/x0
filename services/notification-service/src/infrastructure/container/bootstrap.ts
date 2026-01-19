// src/infrastructure/container/bootstrap.ts

import { Container, ServiceKeys } from "./Container.js";

// Repositories
import { PostgresNotificationRepository } from "../database/PostgresNotificationRepository.js";
import { PostgresUserPreferencesRepository } from "../database/PostgresUserPreferencesRepository.js";
import { PostgresDeviceTokenRepository } from "../database/PostgresDeviceTokenRepository.js";

// Services
import { NotificationService } from "../../application/services/NotificationService.js";

// Controllers
import { NotificationController } from "../../interfaces/http/controllers/NotificationController.js";
import { PreferencesController } from "../../interfaces/http/controllers/PreferencesController.js";
import { DeviceController } from "../../interfaces/http/controllers/DeviceController.js";

export function bootstrap(): Container {
  const container = new Container();

  // Register repositories
  container.register(ServiceKeys.NotificationRepository, () => new PostgresNotificationRepository());
  container.register(ServiceKeys.UserPreferencesRepository, () => new PostgresUserPreferencesRepository());
  container.register(ServiceKeys.DeviceTokenRepository, () => new PostgresDeviceTokenRepository());

  // Register services
  container.register(
    ServiceKeys.NotificationService,
    () =>
      new NotificationService(
        container.resolve(ServiceKeys.NotificationRepository),
        container.resolve(ServiceKeys.UserPreferencesRepository),
        container.resolve(ServiceKeys.DeviceTokenRepository),
      ),
  );

  // Register controllers
  container.register(
    ServiceKeys.NotificationController,
    () => new NotificationController(container.resolve(ServiceKeys.NotificationService)),
  );

  container.register(
    ServiceKeys.PreferencesController,
    () => new PreferencesController(container.resolve(ServiceKeys.UserPreferencesRepository)),
  );

  container.register(
    ServiceKeys.DeviceController,
    () => new DeviceController(container.resolve(ServiceKeys.DeviceTokenRepository)),
  );

  return container;
}
