import { ISystemModule, ISystemPlugin } from '.';

export function createSystemLoader(): ISystemPlugin {
    return {
        fetch(load: ISystemModule) {
            return fetch(load.address).then(res => res.text());
        },
    };
}
