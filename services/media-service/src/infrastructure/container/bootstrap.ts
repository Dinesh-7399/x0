// src/infrastructure/container/bootstrap.ts

import { MediaService } from '../../application/services/MediaService.js';
import { MediaController } from '../../interfaces/http/controllers/MediaController.js';
import { PostgresMediaRepository } from '../database/PostgresMediaRepository.js';
import { createStorageService } from '../services/StorageService.js';
import { Container, ServiceKeys } from './Container.js';

export function bootstrap(): Container {
  const container = new Container();

  // Register storage service
  container.register(ServiceKeys.StorageService, () => createStorageService());

  // Register repositories
  container.register(ServiceKeys.MediaRepository, () => new PostgresMediaRepository());

  // Register services
  container.register(
    ServiceKeys.MediaService,
    () =>
      new MediaService(
        container.resolve(ServiceKeys.MediaRepository),
        container.resolve(ServiceKeys.StorageService),
      ),
  );

  // Register controllers
  container.register(
    ServiceKeys.MediaController,
    () => new MediaController(container.resolve(ServiceKeys.MediaService)),
  );

  return container;
}
