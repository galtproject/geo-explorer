# Geo explorer

Working with SpaceGeoData contract in GaltProject contracts.

Indexing changes of contours and providing api for getting:
- Contours discovery by parent geohashes
- Proof of location by geohashes inside contours

## How to run

1. Edit config.ts, specify database
2. Install database software and configure it at ./database/<config.database>/ folder
3. `npm i`
4. `npm start`

## Environment variables

| Variable | Description |
|-----|-------------|
| DATABASE_NAME | Specify database name for store |
| API_PORT | Specify port of application api  |

## API

| Uri | Description | Output example |
|-----|-------------|----------------|
| /v1/contours/by/inner-geohash/:geohash | get contours list by inner geohash | [{"contour":["w24q8xwf4uq0","w24q8xwfjuk0","w24q8xwfvfk0","w24q8xwfffq0"],"spaceTokenId":"1"},{"contour":["w24q8xwf4uq0","w24q8xwfjuk0","w24q8xwfvfk0","w24q8xwfffq0"],"spaceTokenId":"2"},{"contour":["w24q8xwe6ty4","w24q8xqxcvgc","w24q8xrpuv5x","w24q8xx1su5x","w24q8xxh8wr8"],"spaceTokenId":"0"}] |
| /v1/contours/by/parent-geohash/:geohashes | get by inner  | [{"contour":["w24q8xwf4uq0","w24q8xwfjuk0","w24q8xwfvfk0","w24q8xwfffq0"],"spaceTokenId":"1"},{"contour":["w24q8xwf4uq0","w24q8xwfjuk0","w24q8xwfvfk0","w24q8xwfffq0"],"spaceTokenId":"2"},{"contour":["w24q8xwe6ty4","w24q8xqxcvgc","w24q8xrpuv5x","w24q8xx1su5x","w24q8xxh8wr8"],"spaceTokenId":"0"}] |

##  Tests
```
npm test
```

### Tests coverage ~97.41% Statements.
```
npm run testCoverage
```

