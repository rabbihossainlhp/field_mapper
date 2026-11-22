# Field Mapper API

Minimal Express backend for field perimeter detection and parcel management.

## Run

```sh
npm install
npm run dev
```

The API listens on `http://localhost:5000` by default.

## Endpoints

- `GET /api/health`
- `POST /api/fields/detect`
- `GET /api/fields`
- `POST /api/fields`
- `PUT /api/fields/:id`
- `DELETE /api/fields/:id`

Saved parcels are stored in `data/parcels.json`. Satellite edge detection can replace the starter polygon implementation in `src/utils/geoUtils.js`.
