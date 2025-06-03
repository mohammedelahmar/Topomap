import mongoose from 'mongoose';

const pointSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['Point'],
    default: 'Point'
  },
  coordinates: {
    type: [Number], // [longitude, latitude]
    required: true
  }
});

const markerSchema = new mongoose.Schema({
  location: {
    type: pointSchema,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  icon: {
    type: String, 
    enum: ['pin', 'star', 'flag', 'info', 'warning'],
    default: 'pin'
  },
  color: {
    type: String,
    default: '#3887BE'
  },
  image: {
    type: String // Base64 or URL
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

const featureSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['Feature'],
    default: 'Feature'
  },
  geometry: {
    type: {
      type: String,
      enum: ['Point', 'LineString', 'Polygon'],
      required: true
    },
    coordinates: {
      type: mongoose.Schema.Types.Mixed, // Can be [[lng, lat]] for LineString or [[[lng, lat]]] for Polygon
      required: true
    }
  },
  properties: {
    name: String,
    description: String,
    type: String, // e.g., 'poi', 'route', 'area'
    elevation: Number,
    color: String,
    timestamp: Date,
    metadata: mongoose.Schema.Types.Mixed
  }
});

const mapDataSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  center: {
    type: pointSchema,
    required: true
  },
  zoom: {
    type: Number,
    required: true,
    default: 10
  },
  features: [featureSchema],
  markers: [markerSchema], // Add markers array to the schema
  tags: [String],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the timestamp when document is updated
mapDataSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const MapData = mongoose.model('MapData', mapDataSchema);

export default MapData;