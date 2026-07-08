import { Injectable } from '@nestjs/common';
import { UsersRepository } from './users.repository';
import type { User } from '../db/schema';

@Injectable()
export class UsersService {
  constructor(private readonly repo: UsersRepository) {}

  findByEmail(email: string): Promise<User | undefined> {
    return this.repo.findByEmail(email);
  }

  findById(id: string): Promise<User | undefined> {
    return this.repo.findById(id);
  }
}
