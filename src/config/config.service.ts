import { Injectable } from '@nestjs/common';
import { Env, loadEnv } from './env';

@Injectable()
export class AppConfig {
  readonly env: Env;

  constructor() {
    this.env = loadEnv();
  }
}
