import mongoose from "mongoose";

const CouponSchema = new mongoose.Schema({
    code: {
        type: String,
        trim: true,
        unique: [true, 'Coupon code must be unique'],
        required: [true, 'Coupon code is required'],
        set: value => value.toUpperCase(),
        minlength: [5, 'Coupon code must be at least 5 characters long'],
        maxlength: [15, 'Coupon code cannot exceed 15 characters']
    },
    discount: {
        type: Number,
        required: [true, 'Discount percentage is required'],
        min: [1, 'Discount must be at least 1%'],
        max: [100, 'Discount cannot exceed 100%']
    },
    expirationDate: {
        type: Date,
        required: [true, 'Expiration date is required'],
        validate: {
            validator: function (v) {
                return v > Date.now();  // Coupon should not expire before creation
            },
            message: 'Expiration date must be in the future'
        }
    },
    maxDiscountAmount: {
        type: Number,
        required: [true, 'Maximum discount amount is required'],
        min: [1, 'Maximum discount must be at least 1'],
    },
    minPurchaseAmount: {
        type: Number,
        required: [true, 'Minimum purchase amount is required'],
        min: [1, 'Minimum purchase amount must be at least 1']
    },
    usageLimitPerUser: {
        type: Number,
        default: 1,
        min: [1, 'Usage limit per user must be at least 1']
    },
    totalUsageLimit: {
        type: Number,
        default: Infinity,
        min: [1, 'Total usage limit must be at least 1']
    },
    status: {
        type: String,
        default: 'active',
        enum: {
            values: ['active', 'blocked'],
            message: 'Coupon status must be either "active" or "blocked"'
        }
    },
    usageRecords: [{
        user: {
            type: mongoose.SchemaTypes.ObjectId,
            ref: 'User',
        },
        usedAt: {
            type: Date,
            default: Date.now
        }
    }]
}, {
    timestamps: true  // Automatically adds `createdAt` and `updatedAt` timestamps
});

// Add pre-save validation if needed
CouponSchema.pre('save', function (next) {
    if (this.expirationDate <= Date.now()) {
        throw new Error('Expiration date cannot be in the past');
    }
    next();
});

export const Coupon = mongoose.model('Coupon', CouponSchema);
