const map = L.map('map', {
    zoomControl: false,
    scrollWheelZoom: false,
    doubleClickZoom: false,
    touchZoom: false,
    boxZoom: false,
    keyboard: false
}).setView([ latitude, longitude], 18);
map.panBy([0,150], { animate: false });

L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    maxZoom: 19,
    attribution: '&copy; CARTO',
    subdomains: 'abcd'
}).addTo(map)

document.getElementById('backBtn').addEventListener('click', function (e){
    location.href = '/map';
});
location.href = `/shademap?lat=${latitude}&lon=${longitude}`