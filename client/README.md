# Field Mapper client

The map uses MapLibre GL JS with Esri World Imagery raster tiles. A Mapbox account or access token is not required.

## Run locally

Create `.env` from `.env.example` if needed. Set `VITE_API_URL` to the backend API URL (defaults to `http://localhost:5000/api` in the API client), then run:

```sh
npm install
npm run dev
```

Start the backend separately with `cd ../server && npm start`.

The imagery service is provided by Esri. Follow Esri's attribution and usage terms when deploying the app.
