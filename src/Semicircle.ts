/**
 * Original Javascript Version: https://github.com/jieter/Leaflet-semicircle
 * Draws a semicircle to a leaflet map.
 * Usage
 * -----
 *     const semicircle = new Semicircle(latLng: LatLngExpression, options: SemicircleOptions);
 *     semicircle.addTo(map);
 * Notes
 * -----
 *     All credit goes to @jieter. I only took his code and converted to Typescript friendly version.
 */

import {Canvas, Circle, CircleMarkerOptions, LatLngExpression, point, Point, SVG} from "leaflet";

export interface SemicircleOptions extends CircleMarkerOptions {
    startAngle: number;
    stopAngle: number;
}

export class Semicircle extends Circle {

    public constructor(
        latLng: LatLngExpression = {lat: 0, lng: 0},
        options: SemicircleOptions = {startAngle: 0, stopAngle: 359.99999}
    ) {
        super(latLng, options as CircleMarkerOptions);
        Object.assign(this.semicircleOptions, options);
        this.extendForSemicircle();
        (this as any)._containsPoint = this.containsPoint.bind(this);
    }

    private readonly semicircleOptions: SemicircleOptions = {startAngle: 0, stopAngle: 359.9999};

    private static normalize(angle: number): number {
        while (angle <= -Math.PI) {
            angle += 2.0 * Math.PI;
        }
        while (angle > Math.PI) {
            angle -= 2.0 * Math.PI;
        }
        return angle;
    }

    private static fixAngle(angle: number): number {
        return (angle - 90) * Math.PI / 180.0;
    }

    private static rotate(p: Point, angle: number, r: number): Point {
        return p.add(point(Math.cos(angle), Math.sin(angle)).multiplyBy(r));
    }

    public getDirection(): number {
        return this.getStopAngle() - (this.getStopAngle() - this.getStartAngle()) / 2;
    }

    public getMiddleAngle(): number {
        return Semicircle.fixAngle((this.semicircleOptions.startAngle + this.semicircleOptions.stopAngle) / 2);
    }

    public getStartAngle(): number {
        if (this.semicircleOptions.startAngle < this.semicircleOptions.stopAngle) {
            return Semicircle.fixAngle(this.semicircleOptions.startAngle);
        }
        return Semicircle.fixAngle(this.semicircleOptions.stopAngle);
    }

    public getStopAngle(): number {
        if (this.semicircleOptions.startAngle < this.semicircleOptions.stopAngle) {
            return Semicircle.fixAngle(this.semicircleOptions.stopAngle);
        }
        return Semicircle.fixAngle(this.semicircleOptions.startAngle);
    }

    public isSemicircle(): boolean {
        const diff = Math.abs(this.semicircleOptions.stopAngle - this.semicircleOptions.startAngle);
        const fullCircle = diff === 0 || diff > 359.0;
        if (fullCircle) {
            return false;
        }
        return !fullCircle || (
            !(this.semicircleOptions.startAngle === 0 && this.semicircleOptions.stopAngle > 359)
            && !(this.semicircleOptions.startAngle === this.semicircleOptions.stopAngle)
        );
    }

    public setDirection(direction: number, degrees: number): this {
        degrees = degrees ?? 10;
        if (degrees >= 360) {
            this.setStopAngle(360);
        } else {
            this.semicircleOptions.startAngle = direction - (degrees / 2);
            this.semicircleOptions.stopAngle = direction + (degrees / 2);
        }
        return this.redraw();
    }

    public setStartAngle(angle: number): this {
        this.semicircleOptions.startAngle = angle;
        return this.redraw();
    }

    public setStopAngle(angle: number): this {
        this.semicircleOptions.stopAngle = angle;
        return this.redraw();
    }

    private extendForSemicircle(): void {
        SVG.include({
            _updateCircle(layer): any {
                const circleLayer = layer as any;
                const mapPoint = circleLayer._map.latLngToLayerPoint(circleLayer._latlng);
                const updateSVGCircle = (cLayer) => { // Taken from https://github.com/Leaflet/Leaflet/blob/master/src/layer/vector/SVG.js
                    const p = cLayer._point;
                    const cr = Math.max(Math.round(cLayer._radius), 1);
                    const cr2 = Math.max(Math.round(cLayer._radiusY), 1) || cr;
                    const arc = "a" + cr + "," + cr2 + " 0 1,0 ";
                    // drawing a circle with two half-arcs
                    const d = cLayer._empty() ? "M0 0" :
                        `M${p.x - cr},${p.y}${arc}${cr * 2},0 ${arc}${-cr * 2},0 `;
                    this._setPath(cLayer, d);
                };

                if (!(layer instanceof Semicircle) || !layer.isSemicircle()) {
                    return updateSVGCircle.call(this, layer);
                }
                if (circleLayer._empty()) {
                    return (this as any)._setPath(layer, "M0 0");
                }

                const r = circleLayer._radius as number;
                const r2 = Math.round(circleLayer._radiusY || r);
                const start = Semicircle.rotate(mapPoint, layer.getStartAngle(), r);
                const end = Semicircle.rotate(mapPoint, layer.getStopAngle(), r);
                const largeArc = (layer.semicircleOptions.stopAngle - layer.semicircleOptions.startAngle >= 180) ? "1" : "0";

                const svgText = `M${mapPoint.x},${mapPoint.y}L${start.x},${start.y}A ${r},${r2},0,${largeArc},1,${end.x},${end.y} z`;
                this._setPath(layer, svgText);
            }
        });
        Canvas.include({
            _updateCircle(layer: Semicircle): any {
                const canvasThis = this as any;
                const circleLayer = layer as any;
                if (!canvasThis._drawing || circleLayer._empty()) {
                    return;
                }

                const mapPoint = circleLayer._map.latLngToLayerPoint(circleLayer._latlng);
                const ctx = canvasThis._ctx as CanvasRenderingContext2D;
                const updateCanvasCircle = (cLayer) => {
                    if (!this._drawing || cLayer._empty()) { return; }
                    const p = cLayer._point;
                    const cr = Math.max(Math.round(cLayer._radius), 1);
                    const cs = (Math.max(Math.round(cLayer._radiusY), 1) || cr) / cr;
                    if (cs !== 1) {
                        ctx.save();
                        ctx.scale(1, s);
                    }
                    ctx.beginPath();
                    ctx.arc(p.x, p.y / cs, cr, 0, Math.PI * 2, false);
                    if (cs !== 1) {
                        ctx.restore();
                    }
                    this._fillStroke(ctx, cLayer);
                };

                if (!(layer instanceof Semicircle) || !layer.isSemicircle()) {
                    updateCanvasCircle.call(this, layer);
                    return;
                }

                const r = circleLayer._radius as number;
                const s = (circleLayer._radius || r) / r;
                const start = Semicircle.rotate(mapPoint, layer.getStartAngle(), r);
                if (s !== 1) {
                    ctx.save();
                    ctx.scale(1, s);
                }
                ctx.beginPath();
                ctx.moveTo(mapPoint.x, mapPoint.y);
                ctx.lineTo(start.x, start.y);
                ctx.arc(mapPoint.x, mapPoint.y, r, layer.getStartAngle(), layer.getStopAngle());
                ctx.lineTo(mapPoint.x, mapPoint.y);

                if (s !== 1) {
                    ctx.restore();
                }
                canvasThis._fillStroke(ctx, circleLayer);
            }
        });
    }

    private containsPoint(p: Point): boolean {
        const basePoint: Point = (this as any)._point;
        const radius: number = (this as any)._radius;
        const clickTolerance: () => number = (this as any)._clickTolerance.bind(this);
        let angle = Math.atan2(p.y - basePoint.y, p.x - basePoint.x);
        const nStart = Semicircle.normalize(this.getStartAngle());
        let nStop = Semicircle.normalize(this.getStopAngle());
        if (nStop <= nStart) {
            nStop += 2.0 * Math.PI;
        }
        if (angle <= nStart) {
            angle += 2.0 * Math.PI;
        }
        return nStart < angle && angle <= nStop
            && p.distanceTo(basePoint) <= radius + clickTolerance();
    }
}
