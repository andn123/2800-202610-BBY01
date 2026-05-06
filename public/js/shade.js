//vancouver cords latitude:49.xxxx longitude:-123.xxxx 

/* START OF LEAFLET API MAP*/
console.log(latitude, longitude);
console.log(trees);
console.log(shelter);

const map = L.map('map').setView([ latitude, longitude], 40);

/*Takes this tilelayer and adds it to map above. */
L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    subdomains: 'abcd'
}).addTo(map)

/* Start of creating markers */
const greenIcon = L.icon({
    iconUrl: '/img/shade/tree2.png',
    iconSize: [32, 32],
    iconAnchor: [16,32],
    popupAnchor: [0, -32]
})
// in public trees 0:lon, 1:lat
// in leaflet, it uses lat first
trees.forEach(tree => {
    L.marker([
        tree.geom.geometry.coordinates[1], 
        tree.geom.geometry.coordinates[0]], 
        {icon: greenIcon}
    ).addTo(map);
});

const shelterIcon = L.icon({
    iconUrl: '/img/shade/shelter.png',
    iconSize: [24, 24],
    iconAnchor: [12,20],
    popupAnchor: [0, -24]
});
if(shelter !== null) {
    L.marker([
        shelter.center.lat,
        shelter.center.lon],
        {icon: shelterIcon}
    ).addTo(map);
}

/* End of creating markers */

/* END OF LEAFLET API MAP */







/* 
OpenStreetMap
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap'
}).addTo(map);

CARTO Voyager
L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    subdomains: 'abcd'
}).addTo(map)

CartoDBlight
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    subdomains: 'abcd'
}).addTo(map);
*/