export type FeatureFlag = 'ADVANCED_ANALYTICS' | 'KITCHEN_DISPLAY_SYSTEM' | 'CUSTOM_BRANDING' | 'LOYALTY_PROGRAM';

export interface TenantConfigurationProps {
  tenantId: string;
  features: Map<FeatureFlag, boolean>;
  settings: Map<string, any>;
}

export class TenantConfiguration {
  public readonly tenantId: string;
  private _features: Map<FeatureFlag, boolean>;
  private _settings: Map<string, any>;

  private constructor(props: TenantConfigurationProps) {
    this.tenantId = props.tenantId;
    this._features = props.features;
    this._settings = props.settings;
  }

  public static create(tenantId: string, features?: Map<FeatureFlag, boolean>, settings?: Map<string, any>): TenantConfiguration {
    return new TenantConfiguration({
      tenantId,
      features: features || new Map<FeatureFlag, boolean>(),
      settings: settings || new Map<string, any>(),
    });
  }

  public get features(): ReadonlyMap<FeatureFlag, boolean> {
    return this._features;
  }

  public get settings(): ReadonlyMap<string, any> {
    return this._settings;
  }

  public enableFeature(featureName: FeatureFlag): void {
    this._features.set(featureName, true);
  }

  public disableFeature(featureName: FeatureFlag): void {
    this._features.set(featureName, false);
  }

  public updateSetting(key: string, value: any): void {
    this._settings.set(key, value);
  }

  public isFeatureEnabled(featureName: FeatureFlag): boolean {
    return this._features.get(featureName) === true;
  }

  public getSetting<T>(key: string): T | undefined {
    return this._settings.get(key);
  }
}
