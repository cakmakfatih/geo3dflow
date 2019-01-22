import type { ScaledVector } from './../types/ScaledVector';

export class VectorGenerator {
    mapWidth: number;
    mapHeight: number;
    scaler: number;

    xOffset: number;
    zOffset: number;

    x: number;
    y: number;
    z: number;

    constructor(scaler: number = 360/0.011, coords: number[]){
        this.mapWidth = 1280;
        this.mapHeight = 1280;

        let v = this.latLonToXY(coords);

        this.scaler = scaler * this.mapWidth/360;

        this.xOffset = v[0]*this.scaler;
        this.zOffset = v[1]*this.scaler;
    }

    latLonToXY = (coords: number[]): number[] => {
        return [
            ((this.mapWidth/360) * (180 + coords[0])),
            ((this.mapHeight/360) * (90 - coords[1]))
        ];
    }

    generateVector = (coords: number[], y: number = 2): ScaledVector => {
        let coordinates = this.latLonToXY(coords);
        return {
            x: coordinates[0]*this.scaler - this.xOffset,
            y: y,
            z: coordinates[1]*this.scaler - this.zOffset
        };
    }
}
