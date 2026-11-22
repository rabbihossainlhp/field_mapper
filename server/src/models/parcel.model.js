const fs = require('fs/promises');
const path = require('path');

const dataFile = path.join(__dirname, '../../data/parcels.json');

async function readParcels() {
  try {
    return JSON.parse(await fs.readFile(dataFile, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

async function writeParcels(parcels) {
  await fs.mkdir(path.dirname(dataFile), { recursive: true });
  await fs.writeFile(dataFile, `${JSON.stringify(parcels, null, 2)}\n`, 'utf8');
}

const parcelModel = {
  async findAll() {
    return readParcels();
  },

  async findById(id) {
    const parcels = await readParcels();
    return parcels.find((parcel) => parcel.id === id) || null;
  },

  async create(data) {
    const parcels = await readParcels();
    const newParcel = {
      id: `parcel-${Date.now()}`,
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    parcels.unshift(newParcel);
    await writeParcels(parcels);
    return newParcel;
  },

  async update(id, updates) {
    const parcels = await readParcels();
    const index = parcels.findIndex((parcel) => parcel.id === id);
    if (index === -1) return null;
    parcels[index] = { ...parcels[index], ...updates, updatedAt: new Date().toISOString() };
    await writeParcels(parcels);
    return parcels[index];
  },

  async remove(id) {
    const parcels = await readParcels();
    const index = parcels.findIndex((parcel) => parcel.id === id);
    if (index === -1) return false;
    parcels.splice(index, 1);
    await writeParcels(parcels);
    return true;
  },
};

module.exports = parcelModel;
