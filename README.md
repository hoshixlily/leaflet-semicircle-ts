# Description

Semicircle plugin for leaflet library. 

This is the TypeScript port of the semicircle plugin by @jieter.

Usage
-----
```typescript

const options: SemicircleOptions = {
    startaAngle: 0,
    stopAngle: 120
};
const latLng: LatLngExpression = {
    lat: 26.212313,
    lng: 127.679153
};


const semicircle = new Semicircle(latLng, options);
semicircle.addTo(map);
semicircle.setStyle({
    color: "black",
    fill: "#00a86b",
    radius: 500,
    weight: 3
});
```

Semicircle extends Circle class from Leaflet. Likewise, SemicircleOptions extends the CircleMarkerOptions interface.
Therefore, you can use all the options that you can use with the Circle class.

