# Chef Order Cancellation Feature

## Overview
Chefs can now cancel orders that are in "pending" status, allowing for better order management when items are unavailable or there are kitchen issues.

## How It Works

### For Chefs:
1. **Access**: Navigate to `/chef` (Kitchen Display)
2. **Identify**: Look for orders in the "Pending" column
3. **Cancel**: Click the red ❌ button next to "Start Prep"
4. **Confirm**: Confirm the cancellation in the popup dialog

### Order Status Flow:
```
pending → [CANCEL] → cancelled
pending → preparing → ready → completed
```

### Notifications:
- **Cashiers**: Receive notification when order is cancelled
- **Admins**: Receive notification for all status changes including cancellations

### UI Features:
- ❌ **Cancel Button**: Only visible for pending orders
- **Confirmation Dialog**: Prevents accidental cancellations
- **Real-time Updates**: All interfaces update immediately
- **Visual Feedback**: Cancelled orders are filtered out from active view

## Technical Implementation

### Database:
- Order model supports "cancelled" status
- Cancelled orders are excluded from active kitchen display
- Full order history maintained for reporting

### API Endpoints:
- `PUT /api/orders/[id]/status` - Handles status updates including cancellation
- Sends appropriate notifications to relevant user roles

### User Interfaces:
- **Chef Dashboard**: Shows cancel button for pending orders only
- **Cashier Orders**: Displays cancelled orders with red styling
- **Admin Orders**: Full visibility of all order statuses including cancelled

## Benefits:
1. **Kitchen Efficiency**: Remove orders that can't be fulfilled
2. **Customer Service**: Quick response to unavailable items
3. **Order Management**: Better control over kitchen workflow
4. **Transparency**: All stakeholders notified of cancellations

## Usage Guidelines:
- Only cancel orders when absolutely necessary
- Cancellation should happen quickly while order is still pending
- Consider customer communication for cancelled orders
- Use for inventory issues, equipment problems, or other kitchen constraints