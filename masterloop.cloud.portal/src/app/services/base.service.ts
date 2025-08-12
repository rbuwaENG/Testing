import { HttpClient } from '@angular/common/http';
import { AppSettings } from './app.settings';
import { LocalStorageService } from '../services/local-storage.service';

export abstract class BaseService {
  constructor(
    protected http: HttpClient,
    protected appSettings: AppSettings,
    protected cache: LocalStorageService
  ) {}
}
