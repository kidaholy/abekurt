---
description: Internal Inventory Transfer Workflow
---

# Internal Inventory Transfer Workflow

This workflow governs the movement of items from the main **Store** (bulk) to **Stock** (active POS sales).

## Roles
- **Store Keeper**: Initiates the request.
- **Admin**: Reviews and approves/denies the request.

## Step-by-Step Process

### 1. Initiation
The Store Keeper identifies a need for more stock in the POS.
- Create a `TransferRequest`.
- Select the `StockItem`.
- Specify the `Quantity` to move.
- Add optional `Notes`.

### 2. Notification
The system automatically notifies the Admin.
- Display the request details.
- Show current `storeQuantity` vs `quantity` (POS).
- Highlight if the request exceeds the `storeQuantity`.

### 3. Review
The Admin reviews the pending request.
- **Approve**: If the stock movement is justified.
- **Deny**: If the movement is rejected (e.g., incorrect quantity, stock needed elsewhere).
  - Must provide a `denialReason`.

### 4. Execution (System Automated)
If **Approved**:
- `StoreQuantity` is decremented by the requested amount.
- `Quantity` (POS) is incremented by the same amount.
- A `StoreLog` entry of type `TRANSFER_OUT` is created.
- The request status is set to `approved`.

If **Denied**:
- The request status is set to `denied`.
- The `denialReason` is stored.

## Data Integrity Rules
- The `storeQuantity` must be greater than or equal to the requested quantity at the time of approval.
- The transfer operation must be atomic (to prevent race conditions).
