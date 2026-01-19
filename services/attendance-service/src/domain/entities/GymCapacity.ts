// src/domain/entities/GymCapacity.ts

export interface GymCapacityProps {
  gymId: string;
  maxCapacity: number;
  softLimit: number;
  currentOccupancy: number;
  lastUpdatedAt: Date;
  isOpen: boolean;
  isFull: boolean;
}

export class GymCapacity {
  private constructor(public readonly props: GymCapacityProps) { }

  get currentOccupancy(): number { return this.props.currentOccupancy; }
  get isFull(): boolean { return this.props.isFull; }

  static create(gymId: string, maxCapacity: number): GymCapacity {
    return new GymCapacity({
      gymId,
      maxCapacity,
      softLimit: Math.floor(maxCapacity * 0.8),
      currentOccupancy: 0,
      lastUpdatedAt: new Date(),
      isOpen: true,
      isFull: false,
    });
  }

  static fromPersistence(props: GymCapacityProps): GymCapacity {
    return new GymCapacity(props);
  }

  increment(): void {
    if (this.props.currentOccupancy >= this.props.maxCapacity) {
      // We still track it, but flag as full
      this.props.isFull = true;
    }
    this.props.currentOccupancy++;
    if (this.props.currentOccupancy >= this.props.maxCapacity) {
      this.props.isFull = true;
    }
    this.props.lastUpdatedAt = new Date();
  }

  decrement(): void {
    if (this.props.currentOccupancy > 0) {
      this.props.currentOccupancy--;
    }
    if (this.props.currentOccupancy < this.props.maxCapacity) {
      this.props.isFull = false;
    }
    this.props.lastUpdatedAt = new Date();
  }
}
