export interface MapView<K, V> {
    get(key: K): V;
}

export function recordMapView<K extends string | number | symbol, V>(rec: Record<K, V>): MapView<K, V> {
    return {
        get(key) {
            return rec[key];
        },
    };
}