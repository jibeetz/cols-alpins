import * as L from 'leaflet'
import elevationModule from './leaflet-elevation'
import * as PolylineEncoded from 'polyline-encoded'
import { filterColsList } from './filter_cols'

declare module 'leaflet' {
    namespace control {
        function elevation(options?: any): void
    }

    namespace Polyline {
        function fromEncoded(encoded: string, options?: any): L.Polyline
    }

    export interface Polyline {
        name: string
        startMarker: L.Marker
        finishMarker: L.Marker
        mid_latlng: Array<number>
        start_latlng: L.LatLngTuple
        end_latlng: L.LatLngTuple
        encoded: string
    }
}

type filterColsListD = (cols: Array<L.Polyline>, colsDOMList: HTMLCollectionOf<Element>) => void

interface ElevationObj {
    "name": string,
    "type": string,
    "features": [
        {
            "type": string,
            "geometry": {
                "type": string,
                "coordinates": string[]
            },
            "properties": null
        }]
}

class LesCols {

    private L: any
    private elevationModule: any
    private PolylineEncoded: any
    private mapboxToken: string
    readonly mapBoxAPIUrl: string = 'https://api.mapbox.com/styles/v1/mapbox/{id}/tiles/{z}/{x}/{y}?access_token='
    readonly mapInitCoordinates: L.LatLngTuple = [47.02167640440166, 8.653083890676498]

    readonly mapIconStart: L.DivIcon
    readonly mapIconFinish: L.DivIcon

    readonly mapColColorNormal: string = '#0026af'
    readonly mapColColorHover: string = '#008aff'
    readonly menuColClassSelected: string = 'selected'
    readonly markerTitleStart: string = 'Start'
    readonly markerTitleFinish: string = 'Finish'

    readonly mapStyleStreets: L.TileLayer
    readonly mapStyleOutdoors: L.TileLayer
    readonly mapStyleSatellite: L.TileLayer
    // https://docs.mapbox.com/api/maps/#styles

    readonly mapStyles: L.Control.LayersObject

    readonly mapCredits: string = '<a href="https://github.com/Raruto/leaflet-elevation">Leaflet Elevation</a> | © <a href="https://www.mapbox.com/about/maps/">Mapbox</a> © <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> <strong><a href="https://www.mapbox.com/map-feedback/" target="_blank">Improve this map</a></strong>'

    private menuColsEls: HTMLCollectionOf<Element> = document.getElementsByClassName('menu_col')
    private menuEl: HTMLElement = document.getElementById('menu')
    private menuColsListEl: HTMLElement = document.getElementById('cols_list')
    private menuToggleTriggerEl: HTMLElement = document.getElementById('toggle_list_trigger')

    private cols: Array<L.Polyline>
    private map: L.Map
    private selectedCol: L.Polyline
    private isSelectedCol: boolean = false
    private hoveredCol: L.Polyline
    private mapControlElevation: any
    private filterColsList: filterColsListD

    constructor(mapboxToken: string, L: any, elevationModule: any, PolylineEncoded: any, filterColsList: filterColsListD) {

        this.mapboxToken = mapboxToken
        this.L = L
        this.PolylineEncoded = PolylineEncoded
        this.elevationModule = elevationModule
        this.mapBoxAPIUrl = this.mapBoxAPIUrl + this.mapboxToken

        this.L.control.elevation = this.elevationModule
        this.mapIconStart = this.L.divIcon({ className: 'start_icon' })
        this.mapIconFinish = this.L.divIcon({ className: 'finish_icon' })

        this.mapStyleStreets = this.L.tileLayer(this.mapBoxAPIUrl, { id: 'streets-v11', tileSize: 512, zoomOffset: -1 })
        this.mapStyleOutdoors = this.L.tileLayer(this.mapBoxAPIUrl, { id: 'outdoors-v9', tileSize: 512, zoomOffset: -1 })
        this.mapStyleSatellite = this.L.tileLayer(this.mapBoxAPIUrl, { id: 'satellite-streets-v11', tileSize: 512, zoomOffset: -1 })

        this.mapStyles = {
            'Outdoors': this.mapStyleOutdoors,
            'Streets': this.mapStyleStreets,
            'Satellite': this.mapStyleSatellite
        }

        this.filterColsList = filterColsList

        this.generateApp()
    }

    generateMiddleLatLng(): Array<L.Polyline> {

        return this.cols.map((col: L.Polyline) => {

            let midLat = (col.start_latlng[0] + col.end_latlng[0]) / 2
            let midLng = (col.start_latlng[1] + col.end_latlng[1]) / 2

            col.mid_latlng = [midLat, midLng]

            return col
        })
    }

    setColOpacity(col: L.Polyline, opacityLevel: number): void {

        col.setStyle({
            opacity: opacityLevel
        })
        col.startMarker.setOpacity(opacityLevel)
        col.finishMarker.setOpacity(opacityLevel)
    }

    setupMap(): void {

        this.map = this.L.map('map', {
            attributionControl: false,
            layers: [this.mapStyleStreets]
        }).setView(this.mapInitCoordinates, 9)

        this.L.control.layers(this.mapStyles).addTo(this.map)

        let mapCreditsAttribution: L.Control.Attribution = this.L.control.attribution().addTo(this.map)
        mapCreditsAttribution.addAttribution(this.mapCredits)
        this.map.zoomControl.setPosition('bottomright')

        this.mapControlElevation = L.control.elevation(
            {
                elevationDiv: "#elevation-div",
                useLeafletMarker: false,
                followMarker: false,
                reverseCoords: true,
                theme: "lime-theme"
            }
        )
        this.mapControlElevation.initCustom(this.map)
    }

    applyPathOnMap(col: L.Polyline): L.Polyline {

        let colCoordinates: any = L.Polyline.fromEncoded(col.encoded).getLatLngs()

        let colPolyline: L.Polyline = L.polyline(
            colCoordinates,
            {
                color: this.mapColColorNormal,
                weight: 4,
                opacity: .7,
                lineJoin: 'round'
            }
        ).addTo(this.map).bindPopup(col.name, { autoPan: false }).on('click', function () { console.log('col', col.name) })

        let startMarker: L.Marker<any> = L.marker([col.start_latlng[0], col.start_latlng[1]], {
            icon: this.mapIconStart,
            title: this.markerTitleStart
        }).addTo(this.map)

        let finishMarker: L.Marker<any> = L.marker([col.end_latlng[0], col.end_latlng[1]], {
            icon: this.mapIconFinish,
            title: this.markerTitleFinish
        }).addTo(this.map)

        colPolyline.name = col.name
        colPolyline.startMarker = startMarker
        colPolyline.finishMarker = finishMarker

        Object.assign(colPolyline, col)

        return colPolyline
    }

    addColToMenu(col: L.Polyline): void {

        let menuCol: string = '<li>'
        menuCol += '<a href="#' + col.name.replace(/ /g, '_').toLowerCase() + '" '
        menuCol += 'class="menu_col" '
        menuCol += 'data-name="' + col.name + '" '
        menuCol += 'data-lat="' + col.mid_latlng[0] + '" '
        menuCol += 'data-long="' + col.mid_latlng[1] + '">'
        menuCol += col.name
        menuCol += '</a>'
        menuCol += '</li>'

        this.menuColsListEl.innerHTML += menuCol
    }

    addEventsToMenuCols() {

        let self = this
        Array.from(this.menuColsEls).forEach(function (menuColEl: Element) {

            menuColEl.addEventListener('click', function () {
                self.zoomTo(this)
            })

            menuColEl.addEventListener('mouseenter', function () {
                self.passHover(this, self.mapColColorHover)
            })
            menuColEl.addEventListener('mouseleave', function () {
                self.passHover(this, self.mapColColorNormal)
            })
        })
    }

    passHover(colEl: Element, color: string) {

        let colName = colEl.getAttribute('data-name')
        this.hoveredCol = this.cols.find((col: L.Polyline) => col.name === colName)
        this.hoveredCol.setStyle({
            color: color,
            opacity: 1
        })
    }

    removeSelectedState() {

        let self = this
        Array.from(this.menuColsEls).forEach(function (menuColEl) {
            menuColEl.parentElement.classList.remove(self.menuColClassSelected)
        })
    }

    addToggleEventToMenu() {

        this.menuToggleTriggerEl.addEventListener('click', () => {
            this.menuEl.classList.toggle('hidden')
        })
    }

    setView(lat: number, lng: number) {
        this.map.setView(new L.LatLng(lat, lng), 12, { animate: true })
    }

    zoomTo(e: HTMLElement) {

        let colLat: number = parseFloat(e.getAttribute('data-lat'))
        let colLong: number = parseFloat(e.getAttribute('data-long'))
        let colName: string = e.getAttribute('data-name')
        this.selectedCol = this.cols.find((col: L.Polyline) => col.name === colName)
        this.removeSelectedState()

        e.parentElement.classList.add(this.menuColClassSelected)

        this.isSelectedCol = false
        this.setView(colLat, colLong)
        this.selectedCol.openPopup()

        let fileName = this.selectedCol.name.toLowerCase().replace(/ /g, "_").replace(/ü/g, "u").replace(/\./g, "")
        fetch('data/coords/' + fileName + '.json').then((res) => {
            return res.json()
        }).then((data) => {

            let obj: ElevationObj = {
                "name": "demo.geojson",
                "type": "FeatureCollection",
                "features": [
                    {
                        "type": "Feature",
                        "geometry": {
                            "type": "LineString",
                            "coordinates": data
                        },
                        "properties": null
                    }]
            }

            this.mapControlElevation.loadDataCustom(obj, this.map)
        })

    }

    addEventToMap() {

        this.map.on('moveend click', () => {

            if (this.isSelectedCol) {
                for (var col of this.cols) {
                    this.setColOpacity(col, 1)
                }

                this.isSelectedCol = false
                this.selectedCol = undefined

                this.removeSelectedState()
            }

            if (typeof this.selectedCol !== 'undefined') {
                for (var col of this.cols) {
                    if (col !== this.selectedCol) {
                        this.setColOpacity(col, 0.4)
                    } else {
                        this.setColOpacity(col, 1)
                    }
                }

                this.isSelectedCol = true
            }

        })

    }

    generateApp = async () => {

        this.PolylineEncoded

        const response = await fetch('data/cols.json')
        this.cols = await response.json()

        this.cols = this.generateMiddleLatLng()

        this.setupMap()

        this.cols = this.cols.map(c => {

            this.addColToMenu(c)
            c = this.applyPathOnMap(c)
            return c

        })

        this.addEventToMap()
        this.addEventsToMenuCols()
        this.addToggleEventToMenu()
        this.filterColsList(this.cols, this.menuColsEls)
    }
}

new LesCols(process.env.TOKEN, L, elevationModule, PolylineEncoded, filterColsList)