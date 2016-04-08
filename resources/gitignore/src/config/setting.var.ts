export interface IVariantServerAppSetting {
    dir: {upload: string;};
    regenerateSchema: boolean;
}

export var VariantSetting:IVariantServerAppSetting = {
    dir: {
        upload: '/app/build/upload',
    },
    regenerateSchema: true
};
