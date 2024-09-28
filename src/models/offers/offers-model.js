import mongoose from 'mongoose';

// Offer Schema
const offerSchema = new mongoose.Schema({
  offerTitle: {
    type: String,
    required: [true, 'Offer title is required'],
    minlength: [3, 'Offer title must be at least 3 characters long'],
    maxlength: [100, 'Offer title cannot exceed 100 characters'],
  },
  offerDescription: {
    type: String,
    required: [true, 'Offer description is required'],
    minlength: [10, 'Offer description must be at least 10 characters long'],
    maxlength: [500, 'Offer description cannot exceed 500 characters'],
  },
  discountPercentage: {
    type: Number,
    required: [true, 'Discount percentage is required'],
    min: [0, 'Discount percentage cannot be less than 0'],
    max: [100, 'Discount percentage cannot exceed 100'],
    validate: {
      validator: Number.isInteger,
      message: 'Discount percentage must be an integer',
    },
  },
  offerType: {
    type: String,
    enum: {
      values: ['product', 'category'],
      message: 'Offer type must be either "product" or "category"',
    },
    required: [true, 'Offer type is required'],
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Products',
    required: function() {
      return this.offerType === 'product';
    },
    validate: {
      validator: function(value) {
        return this.offerType !== 'product' || value !== null;
      },
      message: 'Product is required when offer type is "product"',
    },
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: function() {
      return this.offerType === 'category';
    },
    validate: {
      validator: function(value) {
        return this.offerType !== 'category' || value !== null;
      },
      message: 'Category is required when offer type is "category"',
    },
  },
  startDate: {
    type: Date,
    required: [true, 'Start date is required'],
    validate: {
      validator: function(value) {
        return value >= new Date();
      },
      message: 'Start date cannot be in the past',
    },
  },
  endDate: {
    type: Date,
    required: [true, 'End date is required'],
    validate: {
      validator: function(value) {
        return value >= this.startDate;
      },
      message: 'End date must be after the start date',
    },
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Export the Offer model
export default mongoose.model('Offer', offerSchema);
