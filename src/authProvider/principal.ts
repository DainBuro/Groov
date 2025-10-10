import { interfaces } from 'inversify-express-utils';
import { TokenInfo } from '../types/authTypes';

export class Principal implements interfaces.Principal {
  public details: TokenInfo;

  public constructor(details: TokenInfo) {
    this.details = details;
  }

  public isAuthenticated(): Promise<boolean> {
    return Promise.resolve(this.details !== null);
  }

  public isResourceOwner(resourceId: number): Promise<boolean> {
    return Promise.resolve(resourceId === this.details.id);
  }

  public isInRole(role: string): Promise<boolean> {
    return Promise.resolve(role === this.details.role);
  }
}
