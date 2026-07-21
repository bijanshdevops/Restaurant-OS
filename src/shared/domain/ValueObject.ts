interface ValueObjectProps {
  [index: string]: any;
}

export abstract class ValueObject<T extends ValueObjectProps> {
  public readonly props: T;

  constructor(props: T) {
    // Ensure properties are strictly immutable
    this.props = Object.freeze(props);
  }

  public equals(vo?: ValueObject<T>): boolean {
    if (vo === null || vo === undefined) {
      return false;
    }
    if (vo.props === undefined) {
      return false;
    }
    // Deep structural equality proxy (sufficient for most primitive-based VOs)
    return JSON.stringify(this.props) === JSON.stringify(vo.props);
  }
}
