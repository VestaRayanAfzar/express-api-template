export interface IVariantServerAppSetting {
    regenerateSchema:boolean;
}

export var VariantSetting:IVariantServerAppSetting = {
    // This will cause the database driver to regenerate all tables from beginning. All data will be lost
    regenerateSchema: true
};
