// src/domain/entities/Profile.ts

export interface ProfileProps {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  bio?: string;
  avatarUrl?: string;
  phoneNumber?: string;
  location?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Profile Entity
 * 
 * Represents the extended user profile data.
 * Separated from Auth (User) to keep concerns clean.
 */
export class Profile {
  constructor(private readonly props: ProfileProps) { }

  get id(): string { return this.props.id; }
  get userId(): string { return this.props.userId; }
  get firstName(): string { return this.props.firstName; }
  get lastName(): string { return this.props.lastName; }
  get bio(): string | undefined { return this.props.bio; }
  get avatarUrl(): string | undefined { return this.props.avatarUrl; }
  get phoneNumber(): string | undefined { return this.props.phoneNumber; }
  get location(): string | undefined { return this.props.location; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }

  /**
   * Update profile fields
   */
  public update(data: Partial<Omit<ProfileProps, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>) {
    if (data.firstName !== undefined) this.props.firstName = data.firstName;
    if (data.lastName !== undefined) this.props.lastName = data.lastName;

    // Allow setting to undefined/null (clearing)
    if (data.bio !== undefined) this.props.bio = data.bio;
    if (data.avatarUrl !== undefined) this.props.avatarUrl = data.avatarUrl;
    if (data.phoneNumber !== undefined) this.props.phoneNumber = data.phoneNumber;
    if (data.location !== undefined) this.props.location = data.location;

    this.props.updatedAt = new Date();
  }

  /**
   * Create new profile entity
   */
  public static create(userId: string, firstName: string, lastName: string, id?: string): Profile {
    return new Profile({
      id: id || crypto.randomUUID(),
      userId,
      firstName,
      lastName,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  /**
   * Reconstitute from persistence
   */
  public static fromPersistence(props: ProfileProps): Profile {
    return new Profile(props);
  }

  /**
   * Export to persistence
   */
  public toPersistence(): ProfileProps {
    return { ...this.props };
  }
}
