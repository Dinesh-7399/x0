// src/domain/entities/User.ts

/**
 * User Entity (Read-Only)
 * 
 * Represents the Auth User from the Identity Service (users table).
 * Used for reference and basic info.
 */
export interface UserProps {
  id: string;
  email: string;
  roles: string[];
  status: string;
  createdAt: Date;
}

export class User {
  constructor(private readonly props: UserProps) { }

  get id(): string { return this.props.id; }
  get email(): string { return this.props.email; }
  get roles(): string[] { return [...this.props.roles]; }
  get status(): string { return this.props.status; }
  get createdAt(): Date { return this.props.createdAt; }

  public isAdmin(): boolean {
    return this.props.roles.includes('admin') || this.props.roles.includes('superadmin');
  }

  public static fromPersistence(props: UserProps): User {
    return new User(props);
  }
}
